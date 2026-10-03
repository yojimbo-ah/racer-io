import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const AUTH_URL = __ENV.AUTH_URL || 'https://ticket.com';
const RACES_URL = __ENV.RACES_URL || 'https://ticket.com';
const SOCKET_URL = __ENV.SOCKET_URL || 'https://ticket.com';
const PASSWORD = __ENV.TEST_PASSWORD || 'Passw0rd!123';
const RACE_USERS = Number(__ENV.RACE_USERS || 10);
const SAGA_POLL_ATTEMPTS = Number(__ENV.SAGA_POLL_ATTEMPTS || 6);
const SAGA_POLL_INTERVAL_MS = Number(__ENV.SAGA_POLL_INTERVAL_MS || 500);

const raceRequests = new Counter('race_start_requests');
const raceAccepts = new Counter('race_start_accepts');
const sagaStarted = new Rate('race_saga_started');

export const options = {
  scenarios: {
    raceStart: {
      executor: 'per-vu-iterations',
      vus: RACE_USERS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.99'],
    race_start_requests: [`count==${RACE_USERS}`],
    race_start_accepts: [`count==${RACE_USERS}`],
    race_saga_started: ['rate>0.99'],
    'ws_connecting{name:races.position}': ['p(95)<1000'],
  },
};

function jsonParams(extra = {}) {
  return {
    ...extra,
    headers: { 'Content-Type': 'application/json', ...(extra.headers || {}) },
  };
}

function cookieParams(accessToken, refreshToken) {
  const cookies = [];
  if (accessToken) cookies.push(`accessToken=${accessToken}`);
  if (refreshToken) cookies.push(`refreshToken=${refreshToken}`);
  return { headers: { Cookie: cookies.join('; ') } };
}

function responseJson(response, selector) {
  if (!response?.body) return undefined;
  try {
    return selector === undefined ? response.json() : response.json(selector);
  } catch {
    return undefined;
  }
}

function createUser(index) {
  const stamp = `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
  const user = {
    email: `race_load_${stamp}@test.com`,
    password: PASSWORD,
    userName: `race_${stamp}`,
  };
  const response = http.post(
    `${AUTH_URL}/api/users/signup`,
    JSON.stringify(user),
    jsonParams({ tags: { name: 'races.auth.signup' } }),
  );
  const body = responseJson(response) || {};
  const session = {
    id: body.user?.id,
    accessToken: body.token,
    refreshToken: response.cookies?.refreshToken?.[0]?.value || body.accessToken,
  };
  if (response.status !== 201 || !session.id || !session.accessToken) {
    throw new Error(`Could not create race test user ${index}: ${response.status}`);
  }
  return session;
}

function socketUrl() {
  const base = SOCKET_URL.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/socket.io/?EIO=4&transport=websocket`;
}

function publishPosition(session, callback) {
  const response = ws.connect(
    socketUrl(),
    {
      headers: { Cookie: `accessToken=${session.accessToken}` },
      tags: { name: 'races.position' },
    },
    (socket) => {
      socket.on('open', () => socket.send('40'));
      socket.on('message', (message) => {
        if (message === '2') socket.send('3');
        if (message.startsWith('40')) {
          socket.send(`42["position:update",${JSON.stringify({
            x: 10,
            y: 10,
            timestamp: new Date().toISOString(),
          })}]`);
          socket.setTimeout(() => {
            callback();
            socket.close();
          }, 500);
        }
      });
      socket.on('error', () => socket.close());
      socket.setTimeout(() => socket.close(), 5000);
    },
  );
  check(response, {
    'races position websocket connected': (result) => result && result.status === 101,
  });
}

function getRace(session, raceId) {
  const response = http.get(
    `${RACES_URL}/api/races`,
    { ...cookieParams(session.accessToken), tags: { name: 'races.list' } },
  );
  const races = responseJson(response, 'races') || [];
  return races.find((race) => race.id === raceId || race._id === raceId);
}

export function setup() {
  const sessions = [];
  for (let index = 0; index < RACE_USERS; index += 1) {
    sessions.push(createUser(index));
  }
  return { sessions };
}

export function teardown(data) {
  for (const session of data.sessions) {
    if (session.refreshToken) {
      http.post(
        `${AUTH_URL}/api/auth/logout`,
        null,
        { ...cookieParams(undefined, session.refreshToken), tags: { name: 'races.auth.cleanup' } },
      );
    }
  }
}

export default function (data) {
  const session = data.sessions[__VU - 1];
  let raceId;
  let createResponse;
  let acceptResponse;

  publishPosition(session, () => {
    createResponse = http.post(
      `${RACES_URL}/api/races/new`,
      JSON.stringify({
        friendId: session.id,
        startPos: { longitude: 10, latitude: 10 },
        finishPos: { longitude: 10.01, latitude: 10.01 },
      }),
      jsonParams({ ...cookieParams(session.accessToken), tags: { name: 'races.new' } }),
    );
    raceId = responseJson(createResponse, 'raceId');
    raceRequests.add(1);

    check(createResponse, {
      'race create returns 200': (response) => response.status === 200,
      'race create returns an id': () => Boolean(raceId),
    });

    if (!raceId) return;

    acceptResponse = http.post(
      `${RACES_URL}/api/races/accept-race`,
      JSON.stringify({ raceId, accept: true }),
      jsonParams({ ...cookieParams(session.accessToken), tags: { name: 'races.accept' } }),
    );
    raceAccepts.add(1);

    check(acceptResponse, {
      'race accept returns 200': (response) => response.status === 200,
      'race accept confirms start': (response) => responseJson(response, 'accepted') === true,
    });
  });

  if (raceId) {
    let started = false;
    for (let attempt = 0; attempt < SAGA_POLL_ATTEMPTS; attempt += 1) {
      sleep(SAGA_POLL_INTERVAL_MS / 1000);
      const race = getRace(session, raceId);
      if (race?.raceStatus === 'raceStarted') {
        started = true;
        break;
      }
      if (race?.raceStatus === 'raceCancelled') break;
    }
    sagaStarted.add(started ? 1 : 0);
    check({ started }, {
      'race remains started after saga fan-out': (result) => result.started,
    });
  }
}
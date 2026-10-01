import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'https://ticket.com';
export const AUTH_URL = __ENV.AUTH_URL || BASE_URL;
export const POSITIONS_URL = __ENV.POSITIONS_URL || BASE_URL;
export const SOCKET_URL = __ENV.SOCKET_URL || BASE_URL;
export const PASSWORD = __ENV.TEST_PASSWORD || 'Passw0rd!123';
export const THINK_TIME = Number(__ENV.THINK_TIME || 1);

export const PATHS = {
  signup: '/api/users/signup',
  logout: '/api/auth/logout',
  aroundMe: '/api/positions/aroundme',
  healthz: '/api/positions/healthz',
  readyz: '/api/positions/readyz',
};

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  checks: ['rate>0.99'],
};

export function buildOptions(thresholds = {}) {
  return {
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: { ...DEFAULT_THRESHOLDS, ...thresholds },
  };
}

export function uniqueUser() {
  const id = `${__VU}_${__ITER}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `positions_${id}@test.com`,
    password: PASSWORD,
    userName: `pos_${id}`,
  };
}

export function jsonParams(extra = {}) {
  return {
    ...extra,
    headers: { 'Content-Type': 'application/json', ...(extra.headers || {}) },
  };
}

export function cookieParams(accessToken, refreshToken) {
  const cookies = [];
  if (accessToken) cookies.push(`accessToken=${accessToken}`);
  if (refreshToken) cookies.push(`refreshToken=${refreshToken}`);
  return { headers: { Cookie: cookies.join('; ') } };
}

export function responseJson(response, selector) {
  if (!response?.body) return undefined;
  try {
    return selector === undefined ? response.json() : response.json(selector);
  } catch {
    return undefined;
  }
}

export function createTestUser() {
  const user = uniqueUser();
  const response = http.post(
    `${AUTH_URL}${PATHS.signup}`,
    JSON.stringify(user),
    jsonParams({ tags: { name: 'auth.signup' } }),
  );

  return {
    user,
    response,
    accessToken: responseJson(response, 'token'),
    refreshToken: response.cookies?.refreshToken?.[0]?.value || responseJson(response, 'accessToken'),
  };
}

export function cleanupTestUser(session) {
  if (!session?.refreshToken) return;
  http.post(
    `${AUTH_URL}${PATHS.logout}`,
    null,
    { ...cookieParams(undefined, session.refreshToken), tags: { name: 'auth.cleanup' } },
  );
}

export function think() {
  sleep(THINK_TIME);
}

export function socketUrl() {
  const base = SOCKET_URL.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/socket.io/?EIO=4&transport=websocket`;
}

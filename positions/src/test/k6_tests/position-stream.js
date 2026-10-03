import ws from 'k6/ws';
import { Counter } from 'k6/metrics';
import { check } from 'k6';
import {
  SOCKET_URL,
  cleanupTestUser,
  createTestUser,
  buildOptions,
  socketUrl,
} from './helpers.js';

const updatesSent = new Counter('positions_updates_sent');
const STREAM_USERS = Number(__ENV.STREAM_USERS || 1);
const UPDATE_INTERVAL_MS = Number(__ENV.UPDATE_INTERVAL_MS || 250);
const STREAM_DURATION_MS = Number(__ENV.STREAM_DURATION_MS || 10000);

export const options = buildOptions({
  positions_updates_sent: ['count>0'],
  'ws_connecting{name:positions.socket}': ['p(95)<1000'],
});

export function setup() {
  const sessions = [];

  for (let index = 0; index < STREAM_USERS; index += 1) {
    const session = createTestUser();
    if (session.status !== 201 || !session.accessToken) {
      throw new Error(`Could not create socket test user ${index}: ${session.status}`);
    }
    sessions.push(session);
  }

  return { sessions };
}

export function teardown(data) {
  for (const session of data.sessions) {
    cleanupTestUser(session);
  }
}

export default function (data) {
  const session = data.sessions[(__VU - 1) % data.sessions.length];
  let sent = 0;
  const response = ws.connect(
    socketUrl(),
    {
      headers: {
        Cookie: `accessToken=${session.accessToken}`,
      },
      tags: { name: 'positions.socket' },
    },
    (socket) => {
      socket.on('open', () => {
        socket.send('40');
      });

      socket.on('message', (message) => {
        if (message === '2') {
          socket.send('3');
        }
        if (sent === 0 && message.startsWith('40')) {
          const startedAt = Date.now();
          const sendPosition = () => {
            const elapsed = Date.now() - startedAt;
            const payload = {
              x: -73.9857 + elapsed / 1000000,
              y: 40.7484 + elapsed / 2000000,
              vx: 0.01,
              vy: 0.01,
              speed: 0.014,
              heading: 45,
              timestamp: new Date().toISOString(),
              source: 'k6',
            };

            socket.send(`42["position:update",${JSON.stringify(payload)}]`);
            sent += 1;
            updatesSent.add(1);
          };

          sendPosition();
          socket.setInterval(sendPosition, UPDATE_INTERVAL_MS);
          socket.setTimeout(() => socket.close(), STREAM_DURATION_MS);
        }
      });

      socket.on('error', () => socket.close());
      socket.setTimeout(() => socket.close(), 3000);
    },
  );

  check(response, {
    'positions websocket connected': (result) => result && result.status === 101,
    'positions updates were sent': () => sent > 0,
  });
}

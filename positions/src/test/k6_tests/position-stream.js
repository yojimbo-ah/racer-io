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

export const options = buildOptions({
  positions_updates_sent: ['count>0'],
  'ws_connecting{name=positions.socket}': ['p(95)<1000'],
});

export function setup() {
  const session = createTestUser();
  if (session.response.status !== 201 || !session.accessToken) {
    throw new Error(`Could not create socket test user: ${session.response.status}`);
  }
  return session;
}

export function teardown(session) {
  cleanupTestUser(session);
}

export default function (session) {
  let sent = false;
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
        if (!sent && message.startsWith('40')) {
          socket.send(`42["position:update",${JSON.stringify({
            x: -73.9857,
            y: 40.7484,
            vx: 0.01,
            vy: 0.01,
            speed: 0.014,
            heading: 45,
            timestamp: new Date().toISOString(),
            source: 'k6',
          })}]`);
          sent = true;
          updatesSent.add(1);
          socket.setTimeout(() => socket.close(), 250);
        }
      });

      socket.on('error', () => socket.close());
      socket.setTimeout(() => socket.close(), 3000);
    },
  );

  check(response, {
    'positions websocket connected': (result) => result && result.status === 101,
    'positions update was sent': () => sent,
  });
}

import http from 'k6/http';
import { check } from 'k6';
import {
  PATHS,
  POSITIONS_URL,
  cleanupTestUser,
  cookieParams,
  createTestUser,
  buildOptions,
  responseJson,
} from './helpers.js';

export const options = buildOptions({
  'http_req_duration{name=positions.aroundme}': ['p(95)<500'],
});

export function setup() {
  const session = createTestUser();
  if (session.response.status !== 201 || !session.accessToken) {
    throw new Error(`Could not create positions test user: ${session.response.status}`);
  }
  return session;
}

export function teardown(session) {
  cleanupTestUser(session);
}

export default function (session) {
  const response = http.get(
    `${POSITIONS_URL}${PATHS.aroundMe}`,
    { ...cookieParams(session.accessToken), tags: { name: 'positions.aroundme' } },
  );

  check(response, {
    'aroundme returns 200': (result) => result.status === 200,
    'aroundme returns a users array': (result) => Array.isArray(responseJson(result, 'users')),
  });
}

import { check } from 'k6';
import {
  authenticate,
  currentUser,
  loadOptions,
  logout,
  refresh,
  think,
} from './helpers.js';

export const options = loadOptions({
  'http_req_failed{name:currentUser}': ['rate<0.01'],
  'http_req_failed{name:refresh}': ['rate<0.01'],
  'http_req_failed{name:logout}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'flow signup 201': (response) => response.status === 201,
    'flow returns an access token': () => Boolean(session.accessToken),
    'flow returns a refresh cookie': () => Boolean(session.refreshToken),
  });

  if (session.response.status !== 201 || !session.accessToken || !session.refreshToken) {
    think();
    return;
  }

  // currentUser reads the accessToken COOKIE only -- an Authorization header
  // is ignored by the middleware and always resolves to currentUser: null
  const me = currentUser(session.accessToken);

  check(me, {
    'currentUser 200': (response) => response.status === 200,
    'currentUser matches the signup email': (response) =>
      response.json('currentUser.email') === session.user.email,
  });

  const refreshed = refresh(session.refreshToken);

  check(refreshed, {
    'refresh 200': (response) => response.status === 200,
    'refresh returns a new access token': (response) => Boolean(response.json('token')),
  });

  const out = logout(session.refreshToken);

  check(out, {
    'logout 200': (response) => response.status === 200,
    'logout confirms success': (response) =>
      response.json('message') === 'logout had been successful',
  });

  think();
}
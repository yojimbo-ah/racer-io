import { check } from 'k6';
import {
  authenticate,
  expectClientErrors,
  loadOptions,
  logout,
  refresh,
  responseJson,
  think,
} from './helpers.js';

expectClientErrors();

export const options = loadOptions({
  'http_req_failed{name:logout}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'logout signup 201': (response) => response.status === 201,
    'logout signup sets the refresh cookie': () => Boolean(session.refreshToken),
  });

  if (session.response.status !== 201 || !session.refreshToken) {
    think();
    return;
  }

  const res = logout(session.refreshToken);

  check(res, {
    'logout 200': (response) => response.status === 200,
    'logout returns the success message': (response) =>
      responseJson(response, 'message') === 'logout had been successful',
    'logout clears the refresh cookie': (response) =>
      String(response.headers['Set-Cookie']).includes('refreshToken='),
    'logout clears the access cookie': (response) =>
      String(response.headers['Set-Cookie']).includes('accessToken='),
  });

  const reused = refresh(session.refreshToken);

  check(reused, {
    'the deleted session cannot be refreshed': (response) => response.status === 401,
  });

  think();
}
import http from 'k6/http';
import { check } from 'k6';
import {
  authenticate,
  expectClientErrors,
  loadOptions,
  logoutAll,
  responseJson,
  think,
  watch,
} from './helpers.js';

expectClientErrors();

export const options = loadOptions({
  'http_req_failed{name:logoutAll}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'logout-all signup 201': (response) => response.status === 201,
    'logout-all signup sets the refresh cookie': () => Boolean(session.refreshToken),
  });

  if (session.response.status !== 201 || !session.refreshToken) {
    think();
    return;
  }

  const res = logoutAll(session.refreshToken);

  check(res, {
    'logout-all 200': (response) => response.status === 200,
    'logout-all returns the success message': (response) =>
      responseJson(response, 'message') === 'all users had been logged out',
    'logout-all clears the cookies': (response) =>
      Boolean(response.headers['Set-Cookie']),
  });

  const anonymous = watch(
    http.post(`${__ENV.BASE_URL || 'https://ticket.com'}/api/auth/logoutall`, null, {
      headers: {},
      tags: { name: 'logoutAll' },
    }),
  );

  check(anonymous, {
    'logout-all rejects a missing cookie': (response) => response.status === 401,
  });

  think();
}
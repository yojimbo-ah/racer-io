import { check } from 'k6';
import {
  PATHS,
  authCookieOptions,
  expectClientErrors,
  loadOptions,
  rawGet,
  rawPost,
  responseJson,
  think,
} from './helpers.js';

expectClientErrors();

const invalidTokens = ['', 'not-a-jwt', 'a.b.c'];

export const options = loadOptions();

export default function () {
  const anonymous = rawGet(PATHS.currentUser, {}, 'currentUser');

  check(anonymous, {
    'anonymous currentUser 200': (response) => response.status === 200,
    'anonymous currentUser is null': (response) => !responseJson(response, 'currentUser'),
  });

  const noCookie = rawGet(PATHS.refresh, {}, 'refresh');

  check(noCookie, {
    'refresh without a cookie 401': (response) => response.status === 401,
  });

  const logoutNoCookie = rawPost(PATHS.logout, null, { headers: {} }, 'logout');

  check(logoutNoCookie, {
    'logout without a cookie 401': (response) => response.status === 401,
  });

  const logoutAllNoCookie = rawPost(PATHS.logoutAll, null, { headers: {} }, 'logoutAll');

  check(logoutAllNoCookie, {
    'logout-all without a cookie 401': (response) => response.status === 401,
  });

  for (const token of invalidTokens) {
    const label = token || 'empty';

    const res = rawGet(PATHS.refresh, authCookieOptions(undefined, token), 'refresh');

    check(res, {
      [`refresh rejects a ${label} token`]: (response) => response.status === 401,
    });

    const forged = rawPost(
      PATHS.logoutAll,
      null,
      authCookieOptions(undefined, token),
      'logoutAll',
    );

    check(forged, {
      [`logout-all rejects a ${label} token`]: (response) => response.status === 401,
    });
  }

  // kept under /api/users so the ingress actually routes it to auth-srv
  const missingRoute = rawGet(`${PATHS.signup}/definitely-not-a-route`, {}, 'notFound');

  check(missingRoute, {
    'unknown auth route 404': (response) => response.status === 404,
    'unknown auth route returns errors': (response) =>
      Array.isArray(responseJson(response, 'errors')) && responseJson(response, 'errors').length > 0,
  });

  think();
}
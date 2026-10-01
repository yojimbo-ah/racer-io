import http from 'k6/http';
import { sleep } from 'k6';
import { Rate } from 'k6/metrics';

// --------------------------------------------------------------------- config

export const BASE_URL = __ENV.BASE_URL || 'https://ticket.com';
export const PASSWORD = __ENV.TEST_PASSWORD || 'Passw0rd!123';

export const VUS = Number(__ENV.VUS || 1);
export const DURATION = __ENV.DURATION || '30s';
export const THINK_TIME = Number(__ENV.THINK_TIME || 1);
export const POOL_SIZE = Number(__ENV.POOL_SIZE || 25);

export const PATHS = {
  signup: '/api/users/signup',
  signin: '/api/users/signin',
  currentUser: '/api/users/currentUser',
  refresh: '/api/refresh',
  logout: '/api/auth/logout',
  logoutAll: '/api/auth/logoutall',
  healthz: '/api/positions/healthz',
  readyz: '/api/positions/readyz',
};

// -------------------------------------------------------------------- metrics

// any 429 means a rate limiter is still in the path -- apply infra/base
export const rateLimited = new Rate('auth_rate_limited');

// ----------------------------------------------------------------- thresholds

export const DEFAULT_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  checks: ['rate>0.99'],
  auth_rate_limited: ['rate==0'],
};

const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'];

// -------------------------------------------------------------- option shapes

export function loadOptions(thresholds = {}, load = {}) {
  return {
    vus: load.vus || VUS,
    duration: load.duration || DURATION,
    summaryTrendStats: SUMMARY_TREND_STATS,
    thresholds: { ...DEFAULT_THRESHOLDS, ...thresholds },
  };
}

export function rampOptions(stages, thresholds = {}) {
  return {
    scenarios: {
      ramp: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages,
        gracefulRampDown: '15s',
      },
    },
    summaryTrendStats: SUMMARY_TREND_STATS,
    thresholds: { ...DEFAULT_THRESHOLDS, ...thresholds },
  };
}

// -------------------------------------------------------------------- fixtures

export function uniqueUser() {
  const id = `${__VU}_${__ITER}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `load_${id}@test.com`,
    password: PASSWORD,
    userName: `load_${id}`,
  };
}

export function pooledUser(index, stamp = Date.now()) {
  return {
    email: `k6pool_${stamp}_${index}@test.com`,
    password: PASSWORD,
    userName: `k6pool_${stamp}_${index}`,
  };
}

export function think(spread = 0.5) {
  sleep(THINK_TIME + Math.random() * spread);
}

// ------------------------------------------------------------------- plumbing

export function url(path) {
  return `${BASE_URL}${path}`;
}

export function tagged(name, params = {}) {
  return { ...params, tags: { ...(params.tags || {}), name } };
}

export function jsonOptions(extra = {}) {
  return {
    ...extra,
    headers: { 'Content-Type': 'application/json', ...(extra.headers || {}) },
  };
}

export function cookieOptions(refreshToken) {
  return { headers: { Cookie: `refreshToken=${refreshToken}` } };
}

export function authCookieOptions(accessToken, refreshToken) {
  const cookies = [];

  if (accessToken) {
    cookies.push(`accessToken=${accessToken}`);
  }

  if (refreshToken) {
    cookies.push(`refreshToken=${refreshToken}`);
  }

  return { headers: { Cookie: cookies.join('; ') } };
}

export function refreshCookie(response) {
  return response.cookies?.refreshToken?.[0]?.value;
}

export function accessCookie(response) {
  return response.cookies?.accessToken?.[0]?.value;
}

export function responseJson(response, selector) {
  if (!response?.body) {
    return undefined;
  }

  try {
    return selector === undefined ? response.json() : response.json(selector);
  } catch {
    return undefined;
  }
}

export function expectClientErrors() {
  http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));
}

export function watch(response) {
  rateLimited.add(response.status === 429 ? 1 : 0);
  return response;
}

// ------------------------------------------------------------------- requests

export function signup(user, params = {}) {
  return watch(
    http.post(url(PATHS.signup), JSON.stringify(user), tagged('signup', jsonOptions(params))),
  );
}

export function signin(user, params = {}) {
  return watch(
    http.post(
      url(PATHS.signin),
      JSON.stringify({ email: user.email, password: user.password }),
      tagged('signin', jsonOptions(params)),
    ),
  );
}

export function currentUser(accessToken) {
  return watch(
    http.get(url(PATHS.currentUser), tagged('currentUser', authCookieOptions(accessToken))),
  );
}

export function refresh(refreshToken) {
  return watch(http.get(url(PATHS.refresh), tagged('refresh', cookieOptions(refreshToken))));
}

export function logout(refreshToken) {
  return watch(http.post(url(PATHS.logout), null, tagged('logout', cookieOptions(refreshToken))));
}

export function logoutAll(refreshToken) {
  return watch(
    http.post(url(PATHS.logoutAll), null, tagged('logoutAll', cookieOptions(refreshToken))),
  );
}

export function rawGet(path, params = {}, name = 'raw') {
  return watch(http.get(url(path), tagged(name, params)));
}

export function rawPost(path, body, params = {}, name = 'raw') {
  return watch(http.post(url(path), body, tagged(name, params)));
}

// signup returns the refresh token under BOTH the `accessToken` body key and the
// refreshToken cookie, while `token` is the access token -- so read it from the cookie
export function authenticate(user = uniqueUser()) {
  const response = signup(user);
  const body = responseJson(response) || {};

  return {
    user,
    response,
    accessToken: body.token || accessCookie(response),
    refreshToken: refreshCookie(response) || body.accessToken,
  };
}
import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  PATHS,
  authenticate,
  jsonOptions,
  loadOptions,
  responseJson,
  tagged,
  think,
  uniqueUser,
  watch,
} from './helpers.js';

const CONCURRENT_SIGNINS = Number(__ENV.CONCURRENT || 5);

export const options = loadOptions({
  'http_req_failed{name:signin}': ['rate<0.01'],
  'http_req_duration{name:signin}': ['p(95)<1500'],
});

export default function () {
  const users = Array.from({ length: CONCURRENT_SIGNINS }, () => uniqueUser());
  const signups = users.map((user) => authenticate(user));

  check(signups, {
    'every concurrent user was created': (results) =>
      results.length === CONCURRENT_SIGNINS && results.every((result) => result.response.status === 201),
  });

  if (signups.some((result) => result.response.status !== 201)) {
    think();
    return;
  }

  const requests = users.map((user) => [
    'POST',
    `${BASE_URL}${PATHS.signin}`,
    JSON.stringify({ email: user.email, password: user.password }),
    tagged('signin', jsonOptions()),
  ]);
  const responses = http.batch(requests).map(watch);

  check(responses, {
    'every concurrent signin answered': (results) => results.length === CONCURRENT_SIGNINS,
    'every concurrent signin returned 201': (results) =>
      results.length === CONCURRENT_SIGNINS && results.every((r) => r.status === 201),
    'every concurrent signin returned a token': (results) =>
      results.length > 0 && results.every((r) => Boolean(responseJson(r, 'token'))),
  });

  const tokens = responses.map((r) => responseJson(r, 'token')).filter(Boolean).sort();

  check(tokens, {
    'concurrent signins issue distinct access tokens': (list) =>
      list.every((value, index) => index === 0 || value !== list[index - 1]),
  });

  think();
}
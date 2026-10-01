import { check, sleep } from 'k6';
import {
  PATHS,
  expectClientErrors,
  jsonOptions,
  loadOptions,
  rawPost,
  responseJson,
  signup,
  think,
  uniqueUser,
} from './helpers.js';

expectClientErrors();

export const options = loadOptions({
  'http_req_failed{name:signup}': ['rate<0.01'],
});

export default function () {
  const user = uniqueUser();
  const key = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const first = rawPost(
    PATHS.signup,
    JSON.stringify(user),
    jsonOptions({ headers: { 'Idempotency-Key': key } }),
    'signup',
  );

  check(first, {
    'idempotent signup 201': (response) => response.status === 201,
    'idempotent signup returns the user': (response) =>
      responseJson(response, 'user.email') === user.email,
  });

  if (first.status !== 201) {
    think();
    return;
  }

  sleep(1);

  const replay = rawPost(
    PATHS.signup,
    JSON.stringify(user),
    jsonOptions({ headers: { 'Idempotency-Key': key } }),
    'signup',
  );

  check(replay, {
    'a replayed signup returns the original 201': (response) => response.status === 201,
    'a replayed signup returns the original body': (response) =>
      responseJson(response, 'user.email') === user.email,
  });

  const conflicting = rawPost(
    PATHS.signup,
    JSON.stringify({ ...user, userName: `${user.userName}_x` }),
    jsonOptions({ headers: { 'Idempotency-Key': key } }),
    'signup',
  );

  check(conflicting, {
    'the same key with a different body 409': (response) => response.status === 409,
    'the conflict explains the key reuse': (response) =>
      responseJson(response, 'message') === 'Idempotency-Key was reused for a different request',
  });

  const oversized = rawPost(
    PATHS.signup,
    JSON.stringify(uniqueUser()),
    jsonOptions({ headers: { 'Idempotency-Key': Array(257).join('k') } }),
    'signup',
  );

  check(oversized, {
    'an oversized idempotency key 400': (response) => response.status === 400,
  });

  think();
}
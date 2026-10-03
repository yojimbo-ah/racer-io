import { check } from 'k6';
import { authenticate, loadOptions, signin, think, uniqueUser } from './helpers.js';

export const options = loadOptions({
  'http_req_failed{name:signup}': ['rate<0.01'],
  'http_req_failed{name:signin}': ['rate<0.01'],
});

export default function () {
  const session = authenticate(uniqueUser());

  check(session.response, {
    'signup creates the test user': (response) => response.status === 201,
  });

  if (session.response.status !== 201) {
    think();
    return;
  }

  const res = signin(session.user);

  check(res, {
    'signin 201': (response) => response.status === 201,
    'signin returns an access token': (response) => Boolean(response.json('token')),
    'signin returns the same user': (response) =>
      response.json('user.email') === session.user.email,
    'signin sets the refresh cookie': (response) => Boolean(response.cookies?.refreshToken?.length),
  });

  think();
}
import { check } from 'k6';
import {
  expectClientErrors,
  jsonOptions,
  loadOptions,
  rawPost,
  responseJson,
  PATHS,
  authenticate,
  signin,
  think,
} from './helpers.js';

expectClientErrors();

export const options = loadOptions({
  'http_req_failed{name:signin}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'bad-credentials signup 201': (response) => response.status === 201,
  });

  if (session.response.status !== 201) {
    think();
    return;
  }

  const cases = [
    {
      name: 'an unknown email',
      body: {
        email: `ghost_${__VU}_${__ITER}_${Date.now()}@test.com`,
        password: session.user.password,
      },
    },
    { name: 'a wrong password', body: { email: session.user.email, password: 'Wr0ngPassw0rd!9' } },
    { name: 'a malformed email', body: { email: 'not-an-email', password: session.user.password } },
    { name: 'a blank password', body: { email: session.user.email, password: '' } },
    { name: 'a whitespace password', body: { email: session.user.email, password: '     ' } },
  ];

  for (const testCase of cases) {
    const res = rawPost(PATHS.signin, JSON.stringify(testCase.body), jsonOptions(), 'signin');

    check(res, {
      [`signin rejects ${testCase.name}`]: (response) => response.status === 400,
      [`signin leaks no token for ${testCase.name}`]: (response) =>
        !responseJson(response, 'token') && !response.cookies?.refreshToken?.length,
    });
  }

  const valid = signin(session.user);

  check(valid, {
    'signin still works for a real account': (response) => response.status === 201,
    'valid signin returns an access token': (response) => Boolean(responseJson(response, 'token')),
  });

  think();
}
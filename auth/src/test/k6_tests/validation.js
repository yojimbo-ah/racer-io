import { check } from 'k6';
import {
  PATHS,
  PASSWORD,
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

const invalidPayloads = [
  { name: 'malformed email', body: { email: 'not-an-email', password: PASSWORD, userName: 'valid_name' } },
  { name: 'password below 4 chars', body: { email: 'load_valid@test.com', password: 'ab', userName: 'valid_name' } },
  { name: 'password above 20 chars', body: { email: 'load_valid@test.com', password: '123456789012345678901', userName: 'valid_name' } },
  { name: 'userName below 4 chars', body: { email: 'load_valid@test.com', password: PASSWORD, userName: 'ab' } },
  { name: 'userName above 30 chars', body: { email: 'load_valid@test.com', password: PASSWORD, userName: '1234567890123456789012345678901' } },
];

export const options = loadOptions({
  'http_req_failed{name:signup}': ['rate<0.01'],
});

export default function () {
  for (const payload of invalidPayloads) {
    const res = rawPost(
      PATHS.signup,
      JSON.stringify(payload.body),
      jsonOptions(),
      'signup',
    );

    check(res, {
      [`signup rejects ${payload.name}`]: (response) => response.status === 400,
      [`signup rejects ${payload.name} with errors`]: (response) =>
        Array.isArray(responseJson(response, 'errors')) && responseJson(response, 'errors').length > 0,
    });
  }

  const user = uniqueUser();
  const created = signup(user);

  check(created, {
    'signup accepts a valid payload': (response) => response.status === 201,
  });

  if (created.status !== 201) {
    think();
    return;
  }

  const duplicate = signup(user);

  check(duplicate, {
    'signup rejects a duplicate email': (response) => response.status === 400,
    'duplicate email points at the email field': (response) =>
      responseJson(response, 'errors.0.field') === 'email',
  });

  think();
}
import { check } from 'k6';
import { loadOptions, responseJson, signup, think, uniqueUser } from './helpers.js';

export const options = loadOptions();

export default function () {
  const user = uniqueUser();
  const res = signup(user);

  check(res, {
    'signup 201': (response) => response.status === 201,
    'signup returns the user': (response) => responseJson(response, 'user.email') === user.email,
    'signup returns an access token': (response) => Boolean(responseJson(response, 'token')),
    'signup sets the refresh cookie': (response) => Boolean(response.cookies?.refreshToken?.length),
    'signup sets the access cookie': (response) => Boolean(response.cookies?.accessToken?.length),
  });

  think();
}
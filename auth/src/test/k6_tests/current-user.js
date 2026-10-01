import { check } from 'k6';
import { authenticate, currentUser, loadOptions, responseJson, think } from './helpers.js';

export const options = loadOptions({
  'http_req_failed{name:currentUser}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'current-user signup 201': (response) => response.status === 201,
    'current-user signup returns an access token': () => Boolean(session.accessToken),
  });

  if (session.response.status !== 201 || !session.accessToken) {
    think();
    return;
  }

  const res = currentUser(session.accessToken);

  check(res, {
    'currentUser 200': (response) => response.status === 200,
    'currentUser email matches signup': (response) =>
      responseJson(response, 'currentUser.email') === session.user.email,
    'currentUser id is present': (response) => Boolean(responseJson(response, 'currentUser.id')),
    'currentUser carries the supervision flag': (response) =>
      typeof responseJson(response, 'currentUser.underSupervision') === 'boolean',
  });

  think();
}
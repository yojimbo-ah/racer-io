import { check } from 'k6';
import { authenticate, loadOptions, refresh, responseJson, think } from './helpers.js';

const ROUNDS = Number(__ENV.ROUNDS || 1);

export const options = loadOptions({
  'http_req_failed{name:refresh}': ['rate<0.01'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'signup creates a refresh session': (response) => response.status === 201,
    'signup sets the refresh cookie': () => Boolean(session.refreshToken),
  });

  if (session.response.status !== 201 || !session.refreshToken) {
    think();
    return;
  }

  for (let round = 1; round <= ROUNDS; round += 1) {
    const res = refresh(session.refreshToken);

    check(res, {
      [`refresh round ${round} 200`]: (response) => response.status === 200,
      [`refresh round ${round} returns an access token`]: (response) =>
        Boolean(responseJson(response, 'token')),
      [`refresh round ${round} keeps the user`]: (response) =>
        responseJson(response, 'token') !== undefined,
    });

    if (res.status !== 200) {
      break;
    }

    think();
  }

  think();
}
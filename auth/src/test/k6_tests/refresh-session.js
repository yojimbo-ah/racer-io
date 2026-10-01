import { check, sleep } from 'k6';
import {
  authenticate,
  loadOptions,
  refresh,
  responseJson,
  think,
} from './helpers.js';

const REFRESH_ROUNDS = Number(__ENV.ROUNDS || 3);

export const options = loadOptions({
  'http_req_failed{name:refresh}': ['rate<0.01'],
  'http_req_duration{name:refresh}': ['p(95)<800'],
});

export default function () {
  const session = authenticate();

  check(session.response, {
    'refresh-loop signup 201': (response) => response.status === 201,
    'refresh-loop signup sets the refresh cookie': () => Boolean(session.refreshToken),
  });

  if (session.response.status !== 201 || !session.refreshToken) {
    think();
    return;
  }

  let survived = 0;

  for (let round = 1; round <= REFRESH_ROUNDS; round += 1) {
    const res = refresh(session.refreshToken);

    check(res, {
      [`refresh round ${round} 200`]: (response) => response.status === 200,
      [`refresh round ${round} returns an access token`]: (response) =>
        Boolean(responseJson(response, 'token')),
    });

    if (res.status !== 200) {
      break;
    }

    survived += 1;
    sleep(0.5);
  }

  check(survived, {
    [`the session survives all ${REFRESH_ROUNDS} rounds`]: (count) => count === REFRESH_ROUNDS,
  });

  think();
}
import { check } from 'k6';
import {
  POOL_SIZE,
  authenticate,
  currentUser,
  logout,
  pooledUser,
  rampOptions,
  refresh,
  responseJson,
  signin,
  signup,
  think,
  uniqueUser,
} from './helpers.js';

const WEIGHTS = [
  { endpoint: 'signup', share: 0.25 },
  { endpoint: 'signin', share: 0.3 },
  { endpoint: 'currentUser', share: 0.2 },
  { endpoint: 'refresh', share: 0.15 },
  { endpoint: 'logout', share: 0.1 },
];

const STAGES = [
  { duration: '30s', target: 5 },
  { duration: '1m', target: 5 },
  { duration: '30s', target: 20 },
  { duration: '1m', target: 20 },
  { duration: '30s', target: 0 },
];

export const options = rampOptions(STAGES, {
  'http_req_duration{name:signin}': ['p(95)<1000'],
  'http_req_duration{name:signup}': ['p(95)<1500'],
  'http_req_duration{name:currentUser}': ['p(95)<500'],
});

function pickEndpoint() {
  const roll = Math.random();
  let total = 0;

  for (const weight of WEIGHTS) {
    total += weight.share;
    if (roll < total) {
      return weight.endpoint;
    }
  }

  return WEIGHTS[WEIGHTS.length - 1].endpoint;
}

export function setup() {
  const stamp = Date.now();
  const users = [];

  for (let i = 0; i < POOL_SIZE; i += 1) {
    const user = pooledUser(i, stamp);

    const res = signup(user);

    if (res.status !== 201) {
      continue;
    }

    users.push({
      user,
      accessToken: res.json('token'),
      refreshToken: res.cookies?.refreshToken?.[0]?.value || res.json('accessToken'),
    });
  }

  if (users.length === 0) {
    throw new Error('setup could not create any pooled users');
  }

  return { users };
}

export function authMix(data) {
  const session = data.users[Math.floor(Math.random() * data.users.length)];

  switch (pickEndpoint()) {
    case 'signin': {
      const res = signin(session.user);

      check(res, {
        'mix signin 201': (response) => response.status === 201,
        'mix signin returns a token': (response) => Boolean(responseJson(response, 'token')),
      });
      break;
    }

    case 'currentUser': {
      const res = currentUser(session.accessToken);

      check(res, {
        'mix currentUser 200': (response) => response.status === 200,
        'mix currentUser matches': (response) =>
          responseJson(response, 'currentUser.email') === session.user.email,
      });
      break;
    }

    case 'refresh': {
      const res = refresh(session.refreshToken);

      check(res, {
        'mix refresh 200': (response) => response.status === 200,
        'mix refresh returns a token': (response) => Boolean(responseJson(response, 'token')),
      });
      break;
    }

    case 'logout': {
      const res = logout(session.refreshToken);

      check(res, {
        'mix logout 200': (response) => response.status === 200,
      });

      if (res.status === 200) {
        const replacement = authenticate();
        if (replacement.response.status === 201) {
          Object.assign(session, replacement);
        }
      }
      break;
    }

    default: {
      const res = signup(uniqueUser());

      check(res, {
        'mix signup 201': (response) => response.status === 201,
        'mix signup returns a token': (response) => Boolean(responseJson(response, 'token')),
      });
    }
  }

  think(2);
}
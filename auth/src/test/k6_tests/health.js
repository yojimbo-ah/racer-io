import { check } from 'k6';
import { Rate } from 'k6/metrics';
import {
  PATHS,
  expectClientErrors,
  loadOptions,
  rawGet,
  think,
} from './helpers.js';

expectClientErrors();

const notReady = new Rate('auth_not_ready');

export const options = loadOptions({
  'http_req_duration{name:healthz}': ['p(95)<200'],
  auth_not_ready: ['rate==0'],
});

export default function () {
  const healthz = rawGet(PATHS.healthz, {}, 'healthz');

  check(healthz, {
    'healthz 200': (response) => response.status === 200,
  });

  const readyz = rawGet(PATHS.readyz, {}, 'readyz');

  notReady.add(readyz.status === 200 ? 0 : 1);

  check(readyz, {
    'readyz answers 200 or 503': (response) =>
      response.status === 200 || response.status === 503,
  });

  think(0.2);
}
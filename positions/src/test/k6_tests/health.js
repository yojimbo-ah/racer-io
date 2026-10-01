import http from 'k6/http';
import { check } from 'k6';
import { PATHS, POSITIONS_URL, buildOptions } from './helpers.js';

export const options = buildOptions({
  'http_req_duration{name:positions.healthz}': ['p(95)<300'],
  'http_req_duration{name:positions.readyz}': ['p(95)<300'],
});

export default function () {
  const healthz = http.get(`${POSITIONS_URL}${PATHS.healthz}`, { tags: { name: 'positions.healthz' } });
  check(healthz, {
    'positions healthz returns 200': (response) => response.status === 200,
  });

  const readyz = http.get(`${POSITIONS_URL}${PATHS.readyz}`, { tags: { name: 'positions.readyz' } });
  check(readyz, {
    'positions readyz returns 200': (response) => response.status === 200,
  });
}

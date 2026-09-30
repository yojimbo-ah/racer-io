// install the binrarie to run these tests with k6 
// and check the results in graphana
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const email = `load_${__VU}_${__ITER}_${Date.now()}@test.com`;
  const userName = `load_${__VU}_${__ITER}_${Date.now()}`;

  const res = http.post(
    'https://ticket.com/api/users/signup',
    JSON.stringify({ email, password: 'Passw0rd!123' , userName}),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'signup 201': (r) => r.status === 201,
    'cookie set': (r) => r.cookies && Object.keys(r.cookies).length > 0,
  });

  sleep(1);
}
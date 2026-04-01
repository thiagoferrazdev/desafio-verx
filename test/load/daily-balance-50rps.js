import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    daily_balance_peak: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 20,
      maxVUs: 100
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500']
  }
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const response = http.get(`${baseUrl}/daily-balance?merchantId=merchant-1&date=2026-03-31`);

  check(response, {
    'status is 200': (r) => r.status === 200
  });

  sleep(1);
}

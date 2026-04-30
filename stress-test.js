import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm up
    { duration: '60s', target: 100 },  // Ramp up to 100 VUs
    { duration: '90s', target: 100 },  // Sustained peak
    { duration: '30s', target: 300 },  // SPIKE to 300 VUs
    { duration: '30s', target: 100 },  // Recovery
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.1'],
  },
};

const pages = [
  'https://htuai.mubx.dev/',
  'https://htuai.mubx.dev/curricula',
  'https://htuai.mubx.dev/tracker',
  'https://htuai.mubx.dev/progress',
];

export default function () {
  const url = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(url);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}

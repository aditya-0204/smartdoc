import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // 20 concurrent users
    { duration: '30s', target: 50 },  // 50 users (safe cloud threshold)
    { duration: '30s', target: 100 }, // 100 users (Vercel capacity check)
    { duration: '20s', target: 0 },   // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Cloud network latency consider karke 2s
    http_req_failed: ['rate<0.05'],    // Max 5% errors allowed
  },
};

export default function () {
  // Yahan apna actual Vercel domain URL dalein
  const url = 'https://docsmart2025.vercel.app/'; 

  const payload = JSON.stringify({
    userEmail: `vercel_test_${__VU}@example.com`,
    name: 'Cloud Verification Doc',
    docNumber: `V-${__VU}-${__ITER}`,
    expiry: '2030-01-01',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Vercel deployment protection bypass karne ke liye (agar private ho toh)
      'User-Agent': 'k6-load-test',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1); // Real-world user behavior ke liye 1 second delay
}
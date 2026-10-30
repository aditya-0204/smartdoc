import http from 'k6/http';
import { check, sleep } from 'k6';

// Test Configuration: How many virtual users (VUs) and for how long
export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 50 }, 
    { duration: '30s', target: 100 },
    { duration: '15s', target: 0 }, 
  ],
};

const BASE_URL = 'https://smartdoc-nj3x.onrender.com';
const TEST_EMAIL = 'smartdocoffical@gmail.com'; 

export default function () {
  // 1. TEST THE GET ROUTE (Fetch Documents)
  let getRes = http.get(`${BASE_URL}/api/documents?email=${TEST_EMAIL}`);
  
  check(getRes, {
    'GET route status is 200': (r) => r.status === 200,
    'GET response time is acceptable': (r) => r.timings.duration < 1500,
  });
  sleep(1);
  // 2. TEST THE POST ROUTE (Add Document)
  const payload = JSON.stringify({
    userEmail: TEST_EMAIL,
    name: `Load Test Doc ${Math.random()}`,
    docNumber: 'K6-TEST-999',
    expiry: '2030-12-31'
  });

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'x-test-mode': 'true' // skipping the mail
    },
  };

  let postRes = http.post(`${BASE_URL}/api/documents`, payload, params);

  check(postRes, {
    'POST status is 201 (Created) or 200 (Duplicate)': (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);
}
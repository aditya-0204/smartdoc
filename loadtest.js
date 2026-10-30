import http from 'k6/http';
import { check, sleep } from 'k6';

// Test Configuration: How many virtual users (VUs) and for how long
export const options = {
  stages: [
    { duration: '10s', target: 50 },  
    { duration: '20s', target: 50 },  
    { duration: '15s', target: 200 }, 
    { duration: '20s', target: 200 }, 
    { duration: '10s', target: 400 }, 
    { duration: '10s', target: 0 },   
  ],
};

const BASE_URL = 'http://localhost:5000/api/documents';
const TEST_EMAIL = 'smartdocoffical@gmail.com'; 

export default function () {
  // ==========================================
  // 1. TEST THE GET ROUTE (Fetch Documents)
  // ==========================================
  let getRes = http.get(`${BASE_URL}/api/documents?email=${TEST_EMAIL}`);
  
  check(getRes, {
    'GET route status is 200': (r) => r.status === 200,
    'GET response time is acceptable': (r) => r.timings.duration < 1500,
  });

  sleep(1); // Simulate real user wait time

  // ==========================================
  // 2. TEST THE POST ROUTE (Add Document)
  // ==========================================
  const payload = JSON.stringify({
    userEmail: TEST_EMAIL,
    name: `Load Test Doc ${Math.random()}`, 
    docNumber: 'K6-TEST-999',
    expiry: '2030-12-31'
  });

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'x-test-mode': 'true' 
    },
  };

  let postRes = http.post(`${BASE_URL}/api/documents`, payload, params);

  check(postRes, {
    'POST status is 201 (Created) or 200 (Duplicate)': (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);
}
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test Configuration: How many virtual users (VUs) and for how long
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Shuruati 10 sec mein 50 users tak le jao
    { duration: '20s', target: 50 },  // 20 sec tak 50 users hold karo
    { duration: '15s', target: 200 }, // Achanak load badha kar 200 users kar do (Yahan shayad free tier haanfne lagega)
    { duration: '20s', target: 200 }, // 200 users par hold karo (Asli test)
    { duration: '10s', target: 400 }, // Ek aakhiri bada jhatka 400 users ka
    { duration: '10s', target: 0 },   // Wapas 0 par le aao
  ],
};

const BASE_URL = 'https://smartdoc-nj3x.onrender.com';
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
    name: `Load Test Doc ${Math.random()}`, // Randomize to simulate new documents
    docNumber: 'K6-TEST-999',
    expiry: '2030-12-31'
  });

  const params = {
    headers: { 
      'Content-Type': 'application/json',
      'x-test-mode': 'true' // 🚦 This tells the backend to skip the Brevo email
    },
  };

  let postRes = http.post(`${BASE_URL}/api/documents`, payload, params);

  check(postRes, {
    'POST status is 201 (Created) or 200 (Duplicate)': (r) => r.status === 201 || r.status === 200,
  });

  sleep(1);
}
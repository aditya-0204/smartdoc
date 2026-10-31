import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL =
  __ENV.BASE_URL || 'https://smartdoc-nj3x.onrender.com';

const TEST_EMAIL =
  __ENV.TEST_EMAIL || 'smartdocoffical@gmail.com';

const PROFILE = __ENV.PROFILE || 'mixed';

// Custom metrics
const readErrors = new Rate('read_errors');
const writeErrors = new Rate('write_errors');

const readLatency = new Trend('read_latency', true);
const writeLatency = new Trend('write_latency', true);

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 40 },
    { duration: '1m', target: 80 },
    { duration: '30s', target: 100 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    read_errors: ['rate<0.01'],
    write_errors: ['rate<0.01'],
    read_latency: ['p(95)<2000'],
    write_latency: ['p(95)<3000'],
  },

  tags: {
    project: 'SmartDoc',
    test_type: PROFILE,
  },
};

function testRead() {
  const response = http.get(
    `${BASE_URL}/api/documents?email=${encodeURIComponent(TEST_EMAIL)}`,
    {
      tags: { operation: 'read' },
      timeout: '30s',
    }
  );

  const passed = check(response, {
    'GET returns 200': (r) => r.status === 200,
  });

  // Rate.add(true) = success; Rate.add(false) = failure
  readErrors.add(!passed);
  readLatency.add(response.timings.duration);
}

function testWrite() {
  const payload = JSON.stringify({
    userEmail: TEST_EMAIL,
    name: `K6 Test ${__VU}-${__ITER}-${Date.now()}`,
    docNumber: `K6-${__VU}-${__ITER}-${Date.now()}`,
    expiry: '2030-12-31',
  });

  const response = http.post(
    `${BASE_URL}/api/documents`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      },
      tags: { operation: 'write' },
      timeout: '30s',
    }
  );

  const passed = check(response, {
    'POST accepted': (r) =>
      r.status === 200 ||
      r.status === 201 ||
      r.status === 202,
  });

  writeErrors.add(!passed);
  writeLatency.add(response.timings.duration);

  if (!passed) {
    console.error(
      `POST failed | status=${response.status} | body=${String(response.body).slice(0, 200)}`
    );
  }
}

export default function () {
  if (PROFILE === 'read') {
    testRead();
  } else if (PROFILE === 'write') {
    testWrite();
  } else {
    testRead();
    testWrite();
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const metrics = data.metrics;

  const summary = {
    test: 'SmartDoc Performance Benchmark',
    profile: PROFILE,

    http_requests: metrics.http_reqs?.values ?? null,

    http_failures: metrics.http_req_failed?.values ?? null,

    checks: metrics.checks?.values ?? null,

    read_latency: metrics.read_latency?.values ?? null,
    write_latency: metrics.write_latency?.values ?? null,

    read_error_rate: metrics.read_errors?.values ?? null,
    write_error_rate: metrics.write_errors?.values ?? null,

    vus: metrics.vus?.values ?? null,
    vus_max: metrics.vus_max?.values ?? null,
  };

  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    'summary.json': JSON.stringify(data, null, 2),
  };
}
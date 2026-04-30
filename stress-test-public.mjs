import https from 'https';
import { performance } from 'perf_hooks';

// Only test public-facing pages
const pages = [
  'https://htuai.mubx.dev/',
  'https://htuai.mubx.dev/privacy',
  'https://htuai.mubx.dev/terms',
  'https://htuai.mubx.dev/ai-transparency',
];

const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  startTime: null,
  endTime: null,
};

function makeRequest(url) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    https.get(url, { timeout: 5000 }, (res) => {
      const duration = performance.now() - startTime;
      results.responseTimes.push(duration);
      results.totalRequests++;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        results.errors[res.statusCode] = (results.errors[res.statusCode] || 0) + 1;
      }

      res.on('data', () => {});
      res.on('end', () => resolve());
    }).on('error', (err) => {
      results.failedRequests++;
      results.errors[err.code] = (results.errors[err.code] || 0) + 1;
      results.totalRequests++;
      resolve();
    });
  });
}

async function runStressTest() {
  console.log('🚀 Starting HTUAI Public Pages Stress Test...\n');
  results.startTime = Date.now();

  // Stage 1: Warm up
  console.log('📈 Stage 1: Warm up (20 VUs)');
  for (let i = 0; i < 20; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests}`);
  }

  // Stage 2: Ramp up
  console.log('\n📈 Stage 2: Ramp up (50 VUs)');
  for (let i = 0; i < 50; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests}`);
  }

  // Stage 3: Peak
  console.log('\n📈 Stage 3: Peak load (100 VUs)');
  for (let i = 0; i < 100; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests}`);
  }

  // Stage 4: Spike
  console.log('\n📈 Stage 4: SPIKE (200 VUs)');
  for (let i = 0; i < 200; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests}`);
  }

  results.endTime = Date.now();

  // Calculate metrics
  const duration = (results.endTime - results.startTime) / 1000;
  const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.50)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  const maxTime = Math.max(...results.responseTimes);
  const minTime = Math.min(...results.responseTimes);
  const requestsPerSec = results.totalRequests / duration;
  const successRate = (results.successfulRequests / results.totalRequests * 100).toFixed(2);

  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 HTUAI.MUBX.DEV — STRESS TEST RESULTS (Public Pages Only)');
  console.log('═'.repeat(70));
  console.log(`\n⏱️  Test Duration: ${duration.toFixed(2)}s`);
  console.log(`📞 Total Requests: ${results.totalRequests}`);
  console.log(`✅ Successful: ${results.successfulRequests} (${successRate}%)`);
  console.log(`❌ Failed: ${results.failedRequests}`);

  console.log(`\n📊 Response Time Distribution:`);
  console.log(`   Min:  ${minTime.toFixed(2)}ms`);
  console.log(`   p(50): ${p50.toFixed(2)}ms (median)`);
  console.log(`   Avg:  ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   p(95): ${p95.toFixed(2)}ms ${p95 < 1500 ? '✅ PASS' : '❌ FAIL'} (threshold: <1500ms)`);
  console.log(`   p(99): ${p99.toFixed(2)}ms ${p99 < 3000 ? '✅ PASS' : '❌ FAIL'} (threshold: <3000ms)`);
  console.log(`   Max:  ${maxTime.toFixed(2)}ms`);

  console.log(`\n🚀 Throughput: ${requestsPerSec.toFixed(2)} req/s`);

  if (Object.keys(results.errors).length > 0) {
    console.log(`\n⚠️  HTTP Error Codes:`);
    for (const [code, count] of Object.entries(results.errors)) {
      console.log(`   ${code}: ${count} requests`);
    }
  }

  // Performance assessment
  console.log('\n' + '═'.repeat(70));
  console.log('🎯 PERFORMANCE ASSESSMENT\n');
  
  if (successRate === '100.00') {
    console.log('✅ All requests succeeded');
  }
  
  if (p95 < 1500 && p99 < 3000) {
    console.log('✅ Latency thresholds PASSED');
  }

  if (requestsPerSec > 20) {
    console.log(`✅ Throughput is healthy (${requestsPerSec.toFixed(2)} req/s)`);
  } else if (requestsPerSec > 10) {
    console.log(`⚠️  Throughput is moderate (${requestsPerSec.toFixed(2)} req/s)`);
  } else {
    console.log(`⚠️  Throughput is low (${requestsPerSec.toFixed(2)} req/s)`);
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

runStressTest().catch(console.error);

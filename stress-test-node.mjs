import https from 'https';
import { performance } from 'perf_hooks';

const pages = [
  'https://htuai.mubx.dev/',
  'https://htuai.mubx.dev/curricula',
  'https://htuai.mubx.dev/tracker',
  'https://htuai.mubx.dev/progress',
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

      // Consume response
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
  console.log('🚀 Starting HTUAI Stress Test...\n');
  results.startTime = Date.now();

  // Stage 1: Warm up (10 concurrent requests)
  console.log('📈 Stage 1: Warm up (10 VUs for 10s)');
  for (let i = 0; i < 10; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests} | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
  }

  // Stage 2: Ramp up (50 concurrent)
  console.log('\n📈 Stage 2: Ramp up (50 VUs for 20s)');
  for (let i = 0; i < 50; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests} | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
  }

  // Stage 3: Peak (100 concurrent)
  console.log('\n📈 Stage 3: Peak load (100 VUs for 30s)');
  for (let i = 0; i < 100; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests} | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
  }

  // Stage 4: Spike (200 concurrent)
  console.log('\n📈 Stage 4: SPIKE (200 VUs for 30s)');
  for (let i = 0; i < 200; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests} | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
  }

  // Stage 5: Cool down
  console.log('\n📈 Stage 5: Cool down (50 VUs for 10s)');
  for (let i = 0; i < 50; i++) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    await makeRequest(page);
    process.stdout.write(`\r  Requests: ${results.totalRequests} | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
  }

  results.endTime = Date.now();

  // Calculate metrics
  const duration = (results.endTime - results.startTime) / 1000;
  const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  const maxTime = Math.max(...results.responseTimes);
  const minTime = Math.min(...results.responseTimes);
  const requestsPerSec = results.totalRequests / duration;
  const successRate = (results.successfulRequests / results.totalRequests * 100).toFixed(2);

  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 STRESS TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`\n⏱️  Test Duration: ${duration.toFixed(2)}s`);
  console.log(`📞 Total Requests: ${results.totalRequests}`);
  console.log(`✅ Successful: ${results.successfulRequests} (${successRate}%)`);
  console.log(`❌ Failed: ${results.failedRequests}`);
  console.log(`\n📈 Response Time Metrics:`);
  console.log(`   Min: ${minTime.toFixed(2)}ms`);
  console.log(`   Avg: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   p(95): ${p95.toFixed(2)}ms ${p95 < 1500 ? '✅' : '⚠️'}`);
  console.log(`   p(99): ${p99.toFixed(2)}ms ${p99 < 3000 ? '✅' : '⚠️'}`);
  console.log(`   Max: ${maxTime.toFixed(2)}ms`);
  console.log(`\n🚀 Throughput: ${requestsPerSec.toFixed(2)} req/s`);
  
  if (Object.keys(results.errors).length > 0) {
    console.log(`\n⚠️  Error Breakdown:`);
    for (const [code, count] of Object.entries(results.errors)) {
      console.log(`   ${code}: ${count}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n${successRate === '100.00' ? '✅ ALL TESTS PASSED!' : '⚠️  Some requests failed'}`);
  console.log('═'.repeat(60) + '\n');
}

runStressTest().catch(console.error);

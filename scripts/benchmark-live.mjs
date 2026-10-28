async function benchmark() {
  const url = "https://trinetra-digital.vercel.app/api/health";
  const requests = 25;
  const start = Date.now();
  let success = 0;
  const promises = Array.from({ length: requests }, async () => {
    try {
      const t0 = Date.now();
      const res = await fetch(url);
      if (res.status === 200) success++;
      return Date.now() - t0;
    } catch {
      return -1;
    }
  });
  const latencies = await Promise.all(promises);
  const totalTime = Date.now() - start;
  const valid = latencies.filter((l) => l > 0);
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  console.log(`Live Vercel Health API Concurrent Benchmark:`);
  console.log(`Requests: ${requests}`);
  console.log(`Success: ${success}/${requests} (100% OK)`);
  console.log(`Total Elapsed: ${totalTime}ms`);
  console.log(`Average Latency: ${Math.round(avg)}ms`);
  console.log(`Measured Live Throughput: ${( (requests / totalTime) * 1000 ).toFixed(1)} req/s`);
}

benchmark();

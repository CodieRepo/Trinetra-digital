import http from 'http';

const videos = [
  'trinetra-hero-video.mp4',
  'vastuproject.mp4',
  'akuafiproject.mp4',
  'build-growth-automate.mp4',
  'why-tinetra.mp4',
  'pricing.mp4'
];

async function checkVideo(video) {
  return new Promise((resolve) => {
    const url = `http://localhost:4173/${video}`;
    http.get(url, (res) => {
      resolve({
        video,
        url,
        status: res.statusCode
      });
    }).on('error', (err) => {
      resolve({
        video,
        url,
        status: `ERROR: ${err.message}`
      });
    });
  });
}

async function run() {
  console.log("=== NEW VIDEO HTTP ACCESSIBILITY CHECK ===");
  for (const video of videos) {
    const res = await checkVideo(video);
    console.log(`Expected URL part: /${video}`);
    console.log(`Actual URL tested: ${res.url}`);
    console.log(`HTTP Status:      ${res.status}`);
    console.log("--------------------------------------");
  }
}

run();

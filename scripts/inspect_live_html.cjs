const https = require("https");

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, html: data }));
    }).on("error", reject);
  });
}

async function inspectLiveHtml() {
  console.log("Fetching live SSR page HTML from https://trinetra-digital.vercel.app/restaurant-os/provisioning/wizard...");
  const res = await fetchHtml("https://trinetra-digital.vercel.app/restaurant-os/provisioning/wizard");
  console.log("Status:", res.status);
  console.log("Contains 'Setup Wizard':", res.html.includes("Setup Wizard"));
  console.log("Contains 'restaurant-os':", res.html.includes("restaurant-os") || res.html.includes("provisioning"));
}

inspectLiveHtml();

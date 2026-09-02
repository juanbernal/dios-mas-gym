const https = require("https");
https.get("https://api.replicate.com/v1/models/cjwbw/demucs", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => console.log(data));
});

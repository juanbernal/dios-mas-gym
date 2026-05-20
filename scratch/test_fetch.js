import https from 'https';
import http from 'http';

async function robustFetchText(urlStr) {
  if (typeof fetch === 'function') {
    try {
      console.log("Trying global fetch...");
      const response = await fetch(urlStr);
      if (response.ok) {
        return await response.text();
      }
      console.warn(`Global fetch returned status ${response.status}`);
    } catch (fetchErr) {
      console.warn(`Global fetch failed: ${fetchErr.message}`);
    }
  }

  console.log("Falling back to native https/http...");
  return new Promise((resolve, reject) => {
    function get(url, depth) {
      console.log(`[depth ${depth}] GET: ${url}`);
      if (depth > 5) {
        return reject(new Error("Too many redirects"));
      }

      const client = url.startsWith('https') ? https : http;
      client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/csv,text/plain,*/*'
        }
      }, (res) => {
        const statusCode = res.statusCode || 0;
        console.log(`[depth ${depth}] Response Status: ${statusCode}`);

        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return get(redirectUrl, depth + 1);
        }

        if (statusCode < 200 || statusCode >= 300) {
          return reject(new Error(`HTTP Error status ${statusCode}`));
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    }

    get(urlStr, 0);
  });
}

const defaultDiosmasgymUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';

robustFetchText(defaultDiosmasgymUrl)
  .then(data => {
    console.log("SUCCESS! Length of data fetched:", data.length);
    console.log("First 100 characters:", data.substring(0, 100));
  })
  .catch(err => {
    console.error("FAILED! Error details:", err);
  });

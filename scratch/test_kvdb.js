import https from 'https';

const bucketId = 'KfNgfREeCq26UPGC3pQ8nJ';
const statusUrl = `https://kvdb.io/${bucketId}/status`;

const writeData = JSON.stringify({
  enabled: true,
  videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
});

console.log('Testing write to:', statusUrl);

const req = https.request(statusUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': writeData.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Write HTTP Status:', res.statusCode);
    console.log('Write Response:', body);
    
    // Now test read
    console.log('\nTesting read from:', statusUrl);
    https.get(statusUrl, (readRes) => {
      let readBody = '';
      readRes.on('data', chunk => readBody += chunk);
      readRes.on('end', () => {
        console.log('Read HTTP Status:', readRes.statusCode);
        console.log('Read Response:', readBody);
      });
    });
  });
});

req.on('error', err => {
  console.error('Write Error:', err);
});

req.write(writeData);
req.end();

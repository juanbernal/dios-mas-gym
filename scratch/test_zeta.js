import https from 'https';

const binId = 'HzFSZP5mcS';
const url = `https://jsonbin-zeta.vercel.app/api/bins/${binId}`;

const updateData = JSON.stringify({
  enabled: true,
  videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
});

console.log('Testing PUT to:', url);

const req = https.request(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': updateData.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('PUT HTTP Status:', res.statusCode);
    console.log('PUT Response:', body);
    
    // Now test GET
    console.log('\nTesting GET from:', url);
    https.get(url, (readRes) => {
      let readBody = '';
      readRes.on('data', chunk => readBody += chunk);
      readRes.on('end', () => {
        console.log('GET HTTP Status:', readRes.statusCode);
        console.log('GET Response:', readBody);
      });
    });
  });
});

req.on('error', err => {
  console.error('PUT Error:', err);
});

req.write(updateData);
req.end();

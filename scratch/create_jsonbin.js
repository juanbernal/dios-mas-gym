import https from 'https';

const postData = JSON.stringify({
  enabled: false,
  videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
});

const req = https.request('https://api.jsonbin.io/v3/b', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    'X-Bin-Private': 'false' // Create as public bin so it requires zero signup/API key!
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', err => {
  console.error('Error:', err);
});

req.write(postData);
req.end();

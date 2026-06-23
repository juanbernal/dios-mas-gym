import https from 'https';

const postData = JSON.stringify({
  enabled: false,
  videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
});

const req = https.request('https://json.extendsclass.com/bin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
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

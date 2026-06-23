import https from 'https';

const postData = 'email=admin@diosmasgym.com';

const req = https.request('https://kvdb.io/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Generated Bucket ID:', body.trim());
  });
});

req.on('error', err => {
  console.error('Error:', err);
});

req.write(postData);
req.end();

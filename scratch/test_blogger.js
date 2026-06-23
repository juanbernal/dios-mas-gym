const blogId = '5031959192789589903';
const apiKey = 'AIzaSyDA0Aruc7oYRf4K1tbwtKEfLy2dsTllxwU';
const status = 'LIVE';

async function run() {
  const headers = {
    'Referer': 'https://app.diosmasgym.com',
    'Origin': 'https://app.diosmasgym.com',
    'Accept': 'application/json'
  };

  // Try with status=LIVE
  try {
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&status=${status}`, { headers });
    const data = await res.json();
    console.log('WITH STATUS:', res.status, data.error ? data.error.message : `Success: ${data.items ? data.items.length : 0} items`);
  } catch (e) {
    console.error('WITH STATUS Error:', e);
  }

  // Try without status
  try {
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}`, { headers });
    const data = await res.json();
    console.log('WITHOUT STATUS:', res.status, data.error ? data.error.message : `Success: ${data.items ? data.items.length : 0} items`);
  } catch (e) {
    console.error('WITHOUT STATUS Error:', e);
  }
}

run();

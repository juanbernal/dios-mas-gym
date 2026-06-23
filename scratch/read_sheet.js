const url = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec?read=true';

console.log('Fetching Google Sheet proxy data with native fetch...');
try {
  const response = await fetch(url);
  console.log('HTTP Status:', response.status);
  const data = await response.json();
  console.log('Successfully parsed JSON!');
  console.log('Data Type:', Array.isArray(data) ? 'Array' : typeof data);
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    console.log('First item:', data[0]);
  } else {
    console.log('Keys:', Object.keys(data));
  }
} catch (e) {
  console.error('Error fetching/parsing:', e);
}

async function test() {
  const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
  try {
    const url = `${CLOUD_URL}?read=true&t=${Date.now()}`;
    console.log('Fetching sheet rows from:', url);
    const res = await fetch(url);
    console.log('Status:', res.status);
    const rows = await res.json();
    console.log('Total rows:', rows.length);
    const configRows = rows.filter(r => r.Artista === 'CONFIG_MAINTENANCE' || r.Artista?.includes('CONFIG'));
    console.log('Config rows found:', configRows);
    if (rows.length > 0) {
      console.log('First row sample:', rows[0]);
    }
  } catch (e) {
    console.error('Error fetching sheet rows:', e);
  }
}

test();

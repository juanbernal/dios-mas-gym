const defaultDiosmasgymUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
const defaultJuan614Url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';

async function run() {
  try {
    const res = await fetch(defaultDiosmasgymUrl);
    const text = await res.text();
    console.log('DIOSMASGYM CSV STATUS:', res.status);
    console.log('DIOSMASGYM CSV PREVIEW (first 200 chars):');
    console.log(text.slice(0, 200));
    console.log('Line count:', text.split('\n').length);
  } catch (e) {
    console.error('DIOSMASGYM CSV fetch error:', e);
  }

  try {
    const res = await fetch(defaultJuan614Url);
    const text = await res.text();
    console.log('JUAN614 CSV STATUS:', res.status);
    console.log('JUAN614 CSV PREVIEW (first 200 chars):');
    console.log(text.slice(0, 200));
    console.log('Line count:', text.split('\n').length);
  } catch (e) {
    console.error('JUAN614 CSV fetch error:', e);
  }
}

run();

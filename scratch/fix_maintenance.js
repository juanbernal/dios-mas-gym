const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
const params = new URLSearchParams();
params.append('Artista', 'CONFIG_MAINTENANCE');
params.append('name', 'false');
params.append('audioUrl', '/outros/Robot_performing_dumbbell_curls_202605312331.mp4');
params.append('releaseDate', new Date().toISOString().split('T')[0]);

fetch(CLOUD_URL, { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
  body: params.toString() 
})
.then(res => res.text())
.then(data => console.log("Success:", data))
.catch(err => console.error("Error:", err));

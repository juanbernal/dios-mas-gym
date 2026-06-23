import fetch from 'node-fetch';

const urls = [
  'https://i.ytimg.com/vi/3dFk1tykte4/maxresdefault.jpg',
  'https://i.ytimg.com/vi/GV5NtwG5dbE/maxresdefault.jpg',
  'https://i.ytimg.com/vi/W5LwpwKH0Yw/maxresdefault.jpg',
  'https://i.ytimg.com/vi/bvwmGA3nb9Q/maxresdefault.jpg',
  'https://i.ytimg.com/vi/Uf5us_n8qm8/maxresdefault.jpg',
  'https://i.ytimg.com/vi/vOQW6w6n_l0/maxresdefault.jpg',
  'https://i.ytimg.com/vi/uRt33mbAaqY/maxresdefault.jpg',
  'https://i.ytimg.com/vi/pLFmJgXeZdY/maxresdefault.jpg',
  'https://i.ytimg.com/vi/fdlZlMWIN5g/maxresdefault.jpg',
  'https://i.ytimg.com/vi/RalK4VO0Vio/maxresdefault.jpg',
  'https://i.ytimg.com/vi/SsZW3nRbF1s/maxresdefault.jpg',
  'https://i.ytimg.com/vi/WfE5ZHsSd_U/maxresdefault.jpg',
  'https://i.ytimg.com/vi/wKcKaY_HAEE/maxresdefault.jpg',
  'https://i.ytimg.com/vi/Sjzg01x_6t8/maxresdefault.jpg',
  'https://i.ytimg.com/vi/j1wm3KSaS4k/maxresdefault.jpg',
  'https://i.ytimg.com/vi/U23kSepjTxg/maxresdefault.jpg',
  'https://i.ytimg.com/vi/P8_3uEAWwes/maxresdefault.jpg',
  'https://i.ytimg.com/vi/dsIPAfPMxcc/maxresdefault.jpg',
  'https://i.ytimg.com/vi/D_wR0BKkURU/maxresdefault.jpg',
  'https://i.ytimg.com/vi/uuqSi8j3sMg/maxresdefault.jpg'
];

async function run() {
  for (const url of urls) {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`URL: ${url} -> Status: ${res.status}`);
  }
}

run();

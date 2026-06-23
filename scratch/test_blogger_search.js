const blogId = "5031959192789589903";
const apiKey = "AIzaSyDA0Aruc7oYRf4K1tbwtKEfLy2dsTllxwU";

async function run() {
  const q = "testimonio de funky";
  const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/search?key=${apiKey}&q=${encodeURIComponent(q)}&fetchImages=true`;
  console.log("Fetching url with headers:", url);
  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://app.diosmasgym.com/',
        'Origin': 'https://app.diosmasgym.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data items count:", data.items ? data.items.length : 0);
    if (data.items) {
      data.items.forEach(item => {
        console.log("------------------------");
        console.log("ID:", item.id);
        console.log("Title:", item.title);
        console.log("URL:", item.url);
        console.log("Published:", item.published);
      });
    } else {
      console.log("Data:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

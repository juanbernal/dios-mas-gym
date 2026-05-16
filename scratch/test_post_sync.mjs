
async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
    const payload = {
        Artista: "TEST ARTIST CAPS",
        name: "TEST SONG " + Date.now(),
        releaseDate: "2026-05-16",
        preSaveLink: "https://test.com",
        audioUrl: "https://youtube.com/test",
        coverImageUrl: "https://test.com/img.jpg"
    };

    const queryString = new URLSearchParams(payload).toString();
    const fullUrl = `${url}?${queryString}`;

    console.log(`Sending POST to ${fullUrl}...`);
    try {
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();

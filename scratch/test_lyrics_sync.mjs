
async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';
    const payload = {
        artist: "TEST",
        song: "TEST SONG",
        lyrics: "TEST LYRICS"
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

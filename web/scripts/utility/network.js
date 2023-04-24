// Default localhost but can use with a remote machine
// const base = "0.0.0.0:8000";
const base = "10.147.18.230:8000"

async function postData(url = "", data = {}) {
    console.log(data)
    const response = await fetch(url, {
        method: "POST",
        cache: "no-cache",
        headers: {
            'Accept': 'application/json',
            "Content-Type": "application/json",
            'Authorization': `Basic ${btoa('tlawton:dwailwhale')}`
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    
    return response.json();
}

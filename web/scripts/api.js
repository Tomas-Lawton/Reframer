const base = "http://127.0.0.1:8000";

const uuid = "id" + Math.random().toString(16).slice(2);

async function postData(url = "", data = {}) {
    const response = await fetch(url, {
        method: "POST",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });
    return response.json();
}

const dumpUserEvents = (latestJson) => {
    postData(base + "/save_interactions", latestJson)
        .then((res) => console.log(res))
        .catch((e) => console.error(e));
};
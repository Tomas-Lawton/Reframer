//heroku
// const http = "https://";
// const base = "vector-logging-server.herokuapp.com";
// const base = "localhost:8000";

const http = "http://";
const base = "0.0.0.0:8000";
let socket = false;

const ws = new WebSocket("ws://" + base + "/ws");
ws.onclose = (event) => {
    console.log("Closed socket... Running without AI\n" + event);
    alert("Restart server... ded");
};
ws.onopen = (event) => {
    console.log("Connected AI Socket\n" + event);
    socket = true;
};
ws.onmessage = function(event) {
    try {
        loadResponse(JSON.parse(event.data));
    } catch (e) {
        if ((event.data.match(/{/g) || []).length > 1) {
            console.log("Parsing Concurrent JSON events");
        }
        console.log("Cooked ", e);
        controller.clipDrawing = false;
    }
};

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

const logEventAPI = (latestJson) => {
    console.log(latestJson);
    postData(http + base + "/save_interactions", latestJson)
        .then((res) => console.log(res))
        .catch((e) => console.error(e));
};
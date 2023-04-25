// const base = "0.0.0.0:8000";
const base = "10.147.18.230:8000"
if (!base) console.info("No backend in utility/network.js")

class ConectionManager {
    constructor() {
        this.connection = new WebSocket("ws://" + base + "/ws");

    }}

let socket; // WebSocket instance
const maxAttempts = 5; // Maximum number of reconnect attempts
let attempts = 0; // Number of attempts made so far
    
const createSocketConnection = () => {
    socket = new WebSocket("ws://" + base + "/ws");
    socket.onclose = (event) => {
        console.log("Closed socket... Running without AI\n" + event);
        socketLight.style.background = "#f6ab2a";
    };
    socket.onopen = (event) => {
        console.log("Connected AI Socket\n" + event);
        attempts = 0;
        socketLight.style.background = "#00d457";
    };
    socket.onmessage = (event) => {
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
    socket.onerror = (err) => {
        console.error("Socket encountered error: ", err.message, "Closing socket");
        socket.close();

        attempts++;
        if (attempts <= maxAttempts) {
          setTimeout(() => {
            console.log('Reconnecting WebSocket...');
            createSocketConnection();
          }, 1000);
        } else {
          console.log('Max reconnect attempts reached.');
        }
    };
};

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

document.querySelector(".socket-connect").addEventListener("click", () => {
    if (!socket) createSocketConnection();
});
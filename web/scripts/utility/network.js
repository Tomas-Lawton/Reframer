// const base = "0.0.0.0:8000";
const base = "10.147.18.230:8000"
if (!base) console.info("No backend in utility/network.js")
const userId = `${createUUID()}`
let socket; // WebSocket instance
const maxAttempts = 5; // Maximum number of reconnect attempts
let attempts = 0; // Number of attempts made so far

const socketLight = document.querySelector(".socket-connect")

const createSocketConnection = () => {
    socket = new WebSocket("ws://" + base + "/ws/" + userId);
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
            const response = JSON.parse(event.data)
            console.log(response);

            if (response.status === "Update_Main") {
                const data = response.data;

                controller.lastIteration = data.i;
                mainSketch.load(scaleRatio, data.svg, data.fixed, true, true);
                mainSketch.semanticLoss = parseFloat(data.loss);

                let normalised = scaleRange(mainSketch.semanticLoss, -1.7, 0, 160, 0);
                document.querySelectorAll(".spark-val")[0].innerHTML = `${Math.floor(normalised)}/160`;
                document.querySelector(".prompt-loss").innerHTML = `Loss: ${mainSketch.semanticLoss.toPrecision(4)}`;

                incrementHistory();
                setLineLabels(mainSketch.sketchLayer);
            }
            if (response.status === "Returned_Diverse_Sketch") {
                const data = response.data;

                controller.sketches[data.i.toString()].load(
                    sketchSize / 224,
                    data.svg,
                    data.fixed,
                );
                document.querySelector(".progress-count").innerHTML = `${data.i + 1}/16`

                if (data.i === 15) { //end
                    hide(loadingBar)
                    let loaders = diverseSketcheContainer.querySelectorAll(".card-loading").forEach(elem => {
                        elem.classList.remove("button-animation");
                        elem.classList.remove("fa-spinner");
                        elem.classList.add("fa-check");
                    });
                    controller.clipDrawing = false;
                    setActionState("inactive");
                    show(explorerPanel)
                    logger.event("stop-exploring");
                }
            }
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

socketLight.addEventListener("click", () => {
    if (!socket || socket.readyState !== socket.OPEN) createSocketConnection();
});

createSocketConnection();
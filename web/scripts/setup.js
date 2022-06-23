//heroku
// const http = "https://";
// const base = "vector-logging-server.herokuapp.com";

// local
const http = "http://";
const base = "localhost:8000";

const useAI = true;
let socketConnected = false;

if (useAI) {
    document
        .querySelectorAll(".ai-ui")
        .forEach((aiItem) => aiItem.classList.remove("ai-ui"));
    document.getElementById("style-view").style.display = "none";

    var ws = new WebSocket("ws://" + base + "/ws");
    ws.onclose = (event) => {
        console.log("Closed socket... Running without AI\n" + event);
        alert("Restart server... ded");
    };
    ws.onopen = (event) => {
        console.log("Connected AI Socket\n" + event);
        socketConnected = true;
        // alert("Connected");
    };
} else {
    document.getElementById("partial-message").style.display = "block";
    document.getElementById("ai-view").style.display = "none";
    document.getElementById("tabs").remove();
}

// Sketching UI
const canvas = document.getElementById("canvas");

// Actions
const actionControls = document.querySelectorAll(".ai-action");
const aiCard = document.getElementById("describe-card");

// Select UI
const deleteHandler = document.getElementById("delete-handler");
const rotateSlider = document.getElementById("rotate-slider");
const copyHandler = document.getElementById("duplicate-handler");
// const reviseHandler = document.getElementById("revise-handler");
const rotateNumber = document.getElementById("rotate-number");
const scaleSlider = document.getElementById("scale-slider");
const scaleNumber = document.getElementById("scale-number");

// Change to revise
// const initialiseHandler = document.getElementById("initialise-handler");
const transformControl = document.getElementById("transform-ui");

// General UI
const prompt = document.getElementById("messageText");
const promptInput = document.getElementById("prompt-input");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const sketchBook = document.getElementById("sketchbook-panel");
const penControls = document.getElementById("pen-controls");
const message = document.getElementById("message");
const palette = document.getElementById("palette");
const timeKeeper = document.getElementById("time-slider");
// const lossText = document.getElementById("rolling-loss");
const setTraces = document.getElementById("num-traces");
const selectDot = document.getElementById("contain-pen-dot");
const opacitySlider = document.getElementById("opacity-slider");
const stopButton = document.getElementById("stop");
const buttonPanel = document.querySelector(".top-action");
const dropdown = document.getElementById("pen-dropdown");
const penDrop = document.getElementById("pen-drop");
const aiMessage = document.querySelector("#ai-content .panel-subtitle");
const sketchContainer = document.getElementById("canvas-drop");
const staticSketches = document.getElementById("static-sketches");
const explorer = document.getElementById("explore-sketches");
const sketchGrid = document.getElementById("grid-container");
const pen = document.getElementById("pen");

// Utility
let liveCollab = false;
let allowOverwrite = true;
let myPath, erasePath, regionPath, tmpGroup, mask, selectBox;

const sketchTemplate = document.getElementById("sketch-template");

const padding = parseInt(
    window
    .getComputedStyle(document.getElementById("contain-canvas"), null)
    .getPropertyValue("padding")
);

const containerRect = document
    .getElementById("contain-canvas")
    .getBoundingClientRect();

const sketchSize =
    document.querySelectorAll("div#sketch-grid")[0].offsetWidth / 2 - 5;
const reusableExemplar = sketchTemplate.cloneNode(true); //clone to use
sketchTemplate.remove();
// console.log(sketchSize);

if (containerRect.width > window.innerHeight) {
    canvas.width = window.innerHeight - padding * 2;
    canvas.height = window.innerHeight - padding * 2;
} else {
    canvas.height = containerRect.width - padding * 2;
    canvas.width = containerRect.width - padding * 2;
}

const scaleRatio = canvas.width / sketchSize;

// Paper Setup
paper.install(window);
const scope = new PaperScope();
const sketchScope = new PaperScope();
sketchScope.activate();
scope.setup(canvas);
scope.activate();

const userLayer = new Layer(); //for drawing + erase mask
const multiTool = new Tool();
const eraseTool = new Tool();

// timeKeeper.style.width = "0";
multiTool.minDistance = 5;
eraseTool.minDistance = 10;

const maxPointSize = 47.99;
document.getElementById("width-slider").setAttribute("max", maxPointSize);

const promptList = partialSketches.map((elem) => elem[1]);
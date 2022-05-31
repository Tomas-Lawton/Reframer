// const http = "http://";
const http = "https://";

const base = "0.0.0.0:8000";
// const base = "vector-logging-server.herokuapp.com";
// const base = "localhost:8000";
const ws = new WebSocket("wss://" + base + "/ws");
ws.onclose = (event) => {
    console.log("Closed socket... Running without AI\n" + event);
};

// Sketching UI
const canvas = document.getElementById("canvas");
const exemplars = [
    document.getElementById("canvas1"),
    document.getElementById("canvas2"),
    document.getElementById("canvas3"),
    document.getElementById("canvas4"),
];

// Actions
const actionControls = document.querySelectorAll(".ai-action");
const aiCard = document.getElementById("describe-card");

// Select UI
const deleteHandler = document.getElementById("delete-handler");
const rotateSlider = document.getElementById("rotate-slider");
const rotateNumber = document.getElementById("rotate-number");
const scaleSlider = document.getElementById("scale-slider");
const scaleNumber = document.getElementById("scale-number");

const initialiseHandler = document.getElementById("initialise-handler");
const transformControl = document.getElementById("transform-ui");

// General UI
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const artControls = document.getElementById("art-panel");
const penControls = document.getElementById("pen-controls");
const message = document.getElementById("message");
const palette = document.getElementById("palette");
const timeKeeper = document.getElementById("time-slider");
const lossText = document.getElementById("rolling-loss");
const setTraces = document.getElementById("num-traces");
const selectDot = document.getElementById("contain-pen-dot");
const opacitySlider = document.getElementById("opacity-slider");
const stopButton = document.getElementById("stop");

const moodboard = document.getElementById("moodboard-container");
const buttonPanel = document.querySelector(".top-action");
const dropdown = document.getElementById("pen-dropdown");
const penDrop = document.getElementById("pen-drop");
const aiMessage = document.querySelector("#ai-content .panel-subtitle");

// Utility
let liveCollab = false;
let myPath, erasePath, regionPath, tmpGroup, mask, selectBox;

const padding = parseInt(
    window
    .getComputedStyle(document.getElementById("contain-canvas"), null)
    .getPropertyValue("padding-left")
);
const exemplarSize = document
    .querySelector(".exemplar-canvas")
    .getBoundingClientRect().width;
const containerRect = document
    .getElementById("contain-canvas")
    .getBoundingClientRect();

const addExemplarButtons = document.querySelector(".add-exemplar");

if (containerRect.width > window.innerHeight) {
    canvas.width = window.innerHeight;
    canvas.height = window.innerHeight;
} else {
    canvas.height = containerRect.width;
    canvas.width = containerRect.width;
}

const scaleRatio = canvas.width / exemplarSize;

// Paper Setup
paper.install(window);
const scope = new PaperScope();
const exemplarScope = new PaperScope();

exemplars.forEach((exemplar) => {
    exemplar.width = exemplarSize;
    exemplar.height = exemplarSize;
    exemplarScope.setup(exemplar);
});
exemplarScope.activate();
// exemplarScope.projects.forEach((project) => project.activate());
scope.setup(canvas);
scope.activate();

const userLayer = new Layer(); //for drawing + erase mask
const multiTool = new Tool();
const eraseTool = new Tool();

timeKeeper.style.width = "0";
multiTool.minDistance = 5;
eraseTool.minDistance = 10;

const maxPointSize = 47.99;
document.getElementById("width-slider").setAttribute("max", maxPointSize);
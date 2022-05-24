const http = "http://";
const base = "0.0.0.0:8000";
// const base = "aiappserver.herokuapp.com";
// const base = "localhost:8000";
const ws = new WebSocket("ws://" + base + "/ws");

const showAI = true;

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
const scaleSlider = document.getElementById("scale-slider");
const initialiseHandler = document.getElementById("initialise-handler");
const transformControl = document.getElementById("transform-ui");

// General UI
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const buttonPanel = document.getElementById("button-panel");
const artControls = document.getElementById("art-panel");
const penControls = document.getElementById("pen-controls");
const message = document.getElementById("message");
const palette = document.getElementById("palette");
const timeKeeper = document.getElementById("time-slider");
const lossText = document.getElementById("rolling-loss");
const setTraces = document.getElementById("num-traces");
const selectDot = document.getElementById("contain-pen-dot");
const opacitySlider = document.getElementById("opacity-slider");

// Utility
let step = 1;
let doneTransform = 500;
let myPath, erasePath, regionPath, tmpGroup, mask;

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

let largerPadding;
// change to padding left and padding right
if (containerRect.width > window.innerHeight) {
    canvas.width =
        window.innerHeight - buttonPanel.getBoundingClientRect().height;
    canvas.height =
        window.innerHeight - buttonPanel.getBoundingClientRect().height;
    largerPadding = canvas.getBoundingClientRect().left; // padding left
    // paddingTop = 0
} else {
    canvas.height =
        containerRect.width - buttonPanel.getBoundingClientRect().height;
    canvas.width =
        containerRect.width - buttonPanel.getBoundingClientRect().height;
    largerPadding = canvas.getBoundingClientRect().top;
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

const maxPointSize = 79.99;
document.getElementById("width-slider").setAttribute("max", maxPointSize);
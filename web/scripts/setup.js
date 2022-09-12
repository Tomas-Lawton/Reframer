paper.install(window);
const spark = new PaperScope();
const scope = new PaperScope();
const sketchScope = new PaperScope();
sketchScope.activate();
// spark.setup(sparkCanvas);
// spark.activate();
scope.setup(canvas);
scope.activate();
const sketchTool = new Tool();
prompt.focus();
sketchTool.minDistance = 5;

const rectangleOptions = {
    fillColor: "#f5f5f5",
    strokeColor: "#7b66ff",
    opacity: 0.5,
    strokeWidth: 2,
    selected: true,
};
const frameOptions = {
    fillColor: "rgba(226,226,226,0.44)",
    strokeColor: "#7000FF",
    selected: false,
};
const frameColors = [
    "#EF3054",
    "#43AA8B",
    "#254441",
    "#FF6F59",
    "#BC6C25",
    "#89A7A7",
    "#E34A6F",
    "#60A561",
    "#00A5CF",
    "#25A18E",
];

// const sketchSize =
//     document.querySelectorAll("div#sketch-grid")[0].offsetWidth / 2 - 5;
// canvas.width = window.innerWidth;
// canvas.width = window.innerHeight;
// const offX = Math.max(0, canvas.width - canvas.height) / 2;
// const offY = Math.max(0, canvas.height - canvas.width) / 2;
// const offY = 0;
// const offX = (canvas.width - canvas.height) / 2;
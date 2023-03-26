paper.install(window);
const mainScope = new PaperScope();
const sketchScope = new PaperScope();

// sketchScope.activate();
mainScope.setup(canvas);

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
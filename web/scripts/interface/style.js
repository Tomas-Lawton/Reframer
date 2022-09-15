const alphaSlider = document.getElementById("alpha-slider");
const widthSlider = document.getElementById("width-slider");

let dots = document.querySelectorAll(".stroke-circle");
dots.forEach((elem) =>
    elem.addEventListener("click", () => {
        setPointSize(elem.offsetWidth - 4);
        setPenMode("pen", pen);
        dots.forEach((dot) => {
            if (dot == elem) {
                dot.classList.add("current-dot");
            } else {
                dot.classList.remove("current-dot");
            }
        });
    })
);

eyeDropper.addEventListener("click", () => {
    if (controller.penMode !== "dropper") {
        setPenMode("dropper", eyeDropper);
        eyeDropper.classList.add("selected-mode");
        eyeDropper.classList.remove("simple-hover");
        eyeDropper.style.color = "#ffffff";
    } else {
        setPenMode("pen", pen);
        eyeDropper.classList.remove("selected-mode");
        eyeDropper.classList.add("simple-hover");
        eyeDropper.style.color = "#363636;";
    }
});

penTool.addEventListener("click", () => setPenMode("pen"));
eraseTool.addEventListener("click", () => setPenMode("erase"));
selectTool.addEventListener("click", () => setPenMode("select"));

const setAlpha = (a) => {
    a = parseFloat(a).toFixed(2);
    let rgba = getRGBA(a);
    controller.alpha = a;
    controller.strokeColor = rgba;
    setThisColor(rgba);
    alphaSlider.value = a;
    // setPenMode("pen", pen);
};

const setPointSize = (s) => {
    const point = document.getElementById("point-size");
    controller.strokeWidth = parseFloat(s).toPrecision(3);
    point.style.width = controller.strokeWidth + "px";
    point.style.height = controller.strokeWidth + "px";
    if (controller.transformGroup) {
        controller.transformGroup.getItems(
            (item) => (item.strokeWidth = controller.strokeWidth)
        );
    }
    widthSlider.value = controller.strokeWidth;
};

alphaSlider.oninput = (e) => {
    console.log(e.target.value);
    setAlpha(e.target.value);
};

widthSlider.oninput = (e) => {
    setPointSize(e.target.value);
};
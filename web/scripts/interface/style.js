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

eyeDropper.addEventListener("click", (e) => {
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

penTool.addEventListener("click", (e) => setPenMode("pen"));
eraseTool.addEventListener("click", (e) => setPenMode("erase"));
selectTool.addEventListener("click", (e) => setPenMode("select"));

alphaSlider.oninput = (e) => {
    setAlpha(e.target.value);
};
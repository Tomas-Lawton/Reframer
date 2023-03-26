const loadResponse = (result) => {
    // console.log("Result: ", result);
    if (controller.clipDrawing) {
        if (result.status === "None") {
            controller.lastIteration = result.iterations;
            mainSketch.load(scaleRatio, result.svg, result.fixed, true, true);
            mainSketch.semanticLoss = parseFloat(result.loss);

            // for 150 range
            let normalised = scaleRange(mainSketch.semanticLoss, -1.7, 0, 150, 0);
            document.querySelectorAll(".spark-val")[0].innerHTML = `${Math.floor(
        normalised
      )}/150`;

            document.querySelector(
                ".prompt-loss"
            ).innerHTML = `Loss: ${mainSketch.semanticLoss.toPrecision(4)}`;

            incrementHistory();
            setLineLabels(mainSketch.sketchLayer);
        }
        // To Do: Tidy
        if (result.status.match(/\d+/g) != null) {
            if (result.svg === "") return null;
            let sketch = controller.sketches[parseInt(result.status)];
            sketch.load(
                sketchSize / 224,
                result.svg,
                result.fixed,
                sketch.sketchLayer
            );
        }
    }
};

const loadPartial = () => {
    const scaleTo = mainSketch.sketchLayer.view.viewSize.width;
    const idx = Math.floor(Math.random() * partialSketches.length);
    const partial = partialSketches[idx][0];
    const drawPrompt = partialSketches[idx][1];
    document.getElementById("partial-message").innerHTML = drawPrompt;
    let loadedPartial = mainSketch.sketchLayer.importSVG(partial);

    loadedPartial.getItems().forEach((item) => {
        if (item instanceof Path) {
            let newElem = mainSketch.sketchLayer.addChild(item.clone());
            newElem.data.fixed = true;
            newElem.strokeCap = "round";
            newElem.strokeJoin = "round";
        }
    });
    loadedPartial.remove();
    scaleGroup(mainSketch.sketchLayer, scaleTo);
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
};

const incrementHistory = () => {
    sketchHistory.historyHolder.push({
        svg: mainSketch.svg,
        loss: mainSketch.semanticLoss,
    });
    timeKeeper.setAttribute("max", String(sketchHistory.historyHolder.length));
    timeKeeper.value = String(sketchHistory.historyHolder.length);
};
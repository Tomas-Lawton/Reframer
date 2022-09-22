class Sketch {
    constructor(i = null, scope, size, type = "default") {
        this.i = i;
        this.useScope = scope;
        this.type = type; //U or AI or Main?
        this.svg; //sorted already
        this.elem; //DOM elem
        this.sketchLayer;
        this.frameSize = size;
        this.localFrames = [];
        // this.semanticLoss = 1;
        // Fixed path list???

        controller.sketches[this.i] = this;
        // console.log("Created: ", this.i);
    }
    load(s, svg, fixed = null) {
        if (svg === "" || svg === undefined) return;
        this.sketchLayer.clear();
        let importGroup = this.sketchLayer.importSVG(svg);
        let g = importGroup.children[0];
        // console.group(g);
        let scaledGroup = scaleGroup(g, s);
        let finalInserted = this.sketchLayer.insertChildren(
            scaledGroup.index,
            scaledGroup.removeChildren()
        );
        scaledGroup.remove();
        importGroup.remove(); // not g
        if (fixed !== null) {
            for (let i = 0; i < fixed.length; i++) {
                finalInserted[i].data.fixed = fixed[i];
            }
        }
        // this.sketchLayer.getItems().forEach((path, i) => {
        //     !path.data.fixed && (path.color.alpha *= 0.5);
        // });
        this.svg = this.sketchLayer.project.exportSVG({
            asString: true,
        });
    }

    renderMini() {
        let domIdx = this.i;

        let newElem = sketchTemplate.cloneNode(reusableExemplar);
        newElem.style.visibility = "initial";

        let sketchCanvas = newElem.querySelector("canvas");
        sketchCanvas.width = sketchSize;
        sketchCanvas.height = sketchSize;
        this.useScope.setup(sketchCanvas);

        if (domIdx !== null) {
            if (this.useScope !== null) {
                this.sketchLayer = this.useScope.projects[domIdx].activeLayer;
            }

            let removeButton = newElem.querySelector(".fa-minus");
            let stopButton = newElem.querySelector(".fa-hand");
            let loader = newElem.querySelector(".card-loading");

            newElem.id = `${this.type}-sketch-item-${domIdx}`;
            sketchCanvas.id = `${this.type}-sketch-canvas-${domIdx}`;
            // newElem.querySelector("h3").innerHTML = `${this.type}${domIdx}`;
            newElem.querySelector("h3").innerHTML = ``;

            if (this.type === "U") {
                stopButton.style.display = "none";
                loader.style.display = "none";
                removeButton.addEventListener("click", () => {
                    newElem.remove();
                });
            } else {
                stopButton.addEventListener("click", () => {
                    loader.classList.remove("button-animation");
                    loader.classList.remove("fa-spinner");
                    loader.classList.add("fa-check");
                    stopButton.style.background = "#f5f5f5";
                    stopButton.style.background = "#d2d2d2";

                    controller.stopSingle(domIdx);
                    delete controller.activeExplorers[domIdx];
                    if (Object.keys(controller.activeExplorers).length === 0) {
                        setActionState("inactive");
                    }
                });
                removeButton.addEventListener("click", () => {
                    newElem.classList.add("inactive-sketch");
                    controller.stopSingle(domIdx);
                    delete controller.activeExplorers[domIdx];
                    if (Object.keys(controller.activeExplorers).length === 0) {
                        setActionState("inactive");
                    }
                });
            }

            sketchCanvas.addEventListener("click", () => {
                // TO DO refactor so class doesn't reference mainSketch???
                if (mainSketch) {
                    this.importTo(mainSketch);
                }
            });
            // Make draggable
            newElem.addEventListener(
                "dragstart",
                function(e) {
                    e.dataTransfer.setData("text/plain", domIdx);
                },
                false
            );
        } else {
            newElem.id = `default-sketch-item`;
            sketchCanvas.id = `default-canvas`;
        }

        this.elem = newElem;
        return this.elem;
    }
    overwrite(overwriting, fromLayer, s) {
        if (!fromLayer) return;
        overwriting.sketchLayer.clear();
        fromLayer = scaleGroup(fromLayer, s);
        overwriting.sketchLayer.insertChildren(0, fromLayer.removeChildren());
        fromLayer.remove();
    }
    add(overwriting, fromLayer, s) {
        if (!fromLayer) return;
        fromLayer = scaleGroup(fromLayer, s);
        let added = overwriting.sketchLayer.insertChildren(
            fromLayer.index,
            fromLayer.removeChildren()
        );
        fromLayer.remove();

        // Select the added paths
    }
    importTo(overwriting) {
        let i = this.i;
        openModal({
            title: "Overwriting Canvas",
            message: "This will replace the canvas contents. Are you sure?",
            confirmAction: () => {
                ungroup(); //remove first even tho deleted
                this.saveStatic(overwriting.extractScaledSVG(1 / scaleRatio));
                let fromLayer = controller.sketches[i].sketchLayer.clone();
                if (fromLayer.firstChild instanceof Group) {
                    fromLayer = fromLayer.children[0];
                }
                this.overwrite(overwriting, fromLayer, frameOutline / sketchSize);
            },
        });
    }
    clone() {
        let clone = this.sketchLayer.clone({
            insert: false,
        });
        clone.getItems().forEach((path) => {
            path.selected = false;
        });
        return clone;
    }
    extractSVG() {
        return this.clone().exportSVG();
    }
    extractScaledSVG(s) {
        let clone = this.clone();
        let scaledSketch = scaleGroup(clone, s);
        let res = scaledSketch.exportSVG();
        scaledSketch.remove();
        return res;
    }
    saveStatic(sJSON) {
        let sketchCountIndex = controller.sketchScopeIndex;
        let sketch = new Sketch(sketchCountIndex, sketchScope, sketchSize, "U");
        let newElem = sketch.renderMini();
        let toCanvas = sketchScope.projects[sketchCountIndex];
        // change to load??
        toCanvas.activeLayer.importSVG(sJSON);
        newElem.classList.add("bounce");
        // document.getElementById("sketch-grid").prepend(newElem);
        controller.sketchScopeIndex += 1;
    }
    buildSketch() {
        let pathList = [];
        this.sketchLayer.getItems((path) =>
            pathList.push({
                color: path.strokeColor.components.length === 4 ?
                    [...path.strokeColor.components] :
                    [...path.strokeColor.components, 1],
                stroke_width: parseFloat(path.strokeWidth),
                path_data: path.pathData,
                fixed_path: path.data.fixed,
            })
        );
        this.sketch = pathList;
    }
}

mainSketch = new Sketch("main-sketch", mainScope, frameOutline, "main");
mainSketch.svg = paper.project.exportSVG({
    asString: true,
}); //for svg parsing

mainSketch.sketchLayer = new Layer();
mainSketch.frameLayer = new Layer();
mainSketch.sketchLayer.activate();

// Breaks undo because of groups
// mainSketch.frameLayer = new Layer();
// mainSketch.sketchLayer = new Layer();
// console.log(mainSketch.sketchLayer);
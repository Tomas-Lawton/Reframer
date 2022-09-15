// To do clean this up
let sketchTimer,
    penPath,
    erasePath,
    regionPath,
    tmpGroup,
    mask,
    selectBox,
    firstPoint,
    firstErasePoint;

sketchTool.onMouseDown = function(event) {
    clearTimeout(sketchTimer);
    let hitResult = mainSketch.sketchLayer.hitTest(event.point);

    switch (controller.penMode) {
        case "select":
            path = null;

            if (isDeselect(event, hitResult)) {
                ungroup();
                mainSketch.sketchLayer.getItems().forEach((path) => {
                    path.selected = false;
                });

                if (controller.transformGroup !== null) {
                    controller.transformGroup.remove();
                    controller.transformGroup = null;
                }

                // Update
                mainSketch.svg = paper.project.exportSVG({
                    asString: true,
                });
                setLineLabels(mainSketch.sketchLayer);
                if (controller.liveCollab) {
                    controller.continueSketch();
                    controller.liveCollab = false;
                }
                controller.selectBox = new Rectangle(event.point);
            }

            if (hitResult) {
                sketchHistory.pushUndo();
                controller.pause();
                ungroup();
                path = hitResult.item;

                let items = [];
                if (window.event.shiftKey) {
                    path.selected = true;
                    items = getSelectedPaths();
                } else {
                    mainSketch.sketchLayer.getItems().forEach((path) => {
                        path.selected = false;
                    });
                    items = mainSketch.sketchLayer.getItems({
                        inside: path.bounds,
                    });
                    items.forEach((item) => (item.selected = true));
                }

                createGroup(items);
                fitToSelection(items, "moving");
                updateSelectUI();
            }
            break;
        case "pen":
            sketchHistory.pushUndo();
            controller.pause();
            penPath = new Path({
                strokeColor: controller.strokeColor,
                strokeWidth: controller.strokeWidth,
                strokeCap: "round",
                strokeJoin: "round",
            });
            firstPoint = penPath.add(event.point);
            penPath.add({
                ...event.point,
                x: event.point.x + 0.05, //any smaller will break because BE changes to v0
            });
            break;
        case "local":
            controller.drawRegion = new Rectangle(event.point);
            break;
        case "erase":
            sketchHistory.pushUndo();

            controller.pause();

            erasorPath = new Path({
                strokeWidth: controller.strokeWidth,
                strokeCap: "round",
                strokeJoin: "round",
                opacity: 0.85,
                strokeColor: "rgb(255,0, 0)",
            });
            firstErasePoint = erasorPath.add(event.point);
            erasorPath.add({
                ...event.point,
                x: event.point.x + 0.05, //any smaller will break because BE changes to v0
            });
            tmpGroup = new Group({
                children: mainSketch.sketchLayer.removeChildren(),
                blendMode: "source-out",
                insert: false,
            });
            mask = new Group({
                children: [erasorPath, tmpGroup],
                blendMode: "source-over",
            });
            break;
        case "dropper":
            let col = hitResult ? hitResult.item.strokeColor._canvasStyle : "#ffffff";
            controller.strokeColor = col;
            controller.alpha = controller.strokeColor.alpha || 1;
            console.log(controller.alpha);
            setThisColor(controller.strokeColor);
            picker.setColor(controller.strokeColor, true);
            console.log(controller.strokeColor);

            alphaSlider.value = parseFloat(controller.strokeColor.split(",")[3] || 1);
            hitResult && setPointSize(hitResult.item.strokeWidth);
    }
};

sketchTool.onMouseDrag = function(event) {
    switch (controller.penMode) {
        case "pen":
            penPath.add(event.point);
            // penPath.smooth();
            break;
        case "erase":
            erasorPath.add(event.point);
            break;
        case "select":
            if (controller.boundingBox) {
                if (controller.boundingBox.data.state === "moving") {
                    controller.transformGroup.position.x += event.delta.x;
                    controller.transformGroup.position.y += event.delta.y;
                    controller.boundingBox.position.x += event.delta.x;
                    controller.boundingBox.position.y += event.delta.y;

                    // controller.transformGroup.children.forEach((path) => {
                    //     path.data.fixed = true;
                    // });
                    updateSelectUI();
                }
            } else if (controller.selectBox !== undefined) {
                //creating box
                controller.pause();
                controller.selectBox.width += event.delta.x;
                controller.selectBox.height += event.delta.y;
                if (selectBox) {
                    selectBox.remove();
                } // redraw //REFACTOR
                selectBox = new Path.Rectangle(controller.selectBox);
                selectBox.set(rectangleOptions);
            }
            break;
        case "local":
            controller.drawRegion.width += event.delta.x;
            controller.drawRegion.height += event.delta.y;

            if (controller.drawRegion.width < 0) {
                controller.drawRegion.width = 0;
            }
            if (controller.drawRegion.height < 0) {
                controller.drawRegion.height = 0;
            }

            if (regionPath !== undefined) regionPath.remove(); //remove old one. maybe could update the old one instead?
            regionPath = new Path.Rectangle(controller.drawRegion);
            regionPath.set(frameOptions);
            break;
    }
};

sketchTool.onMouseUp = function() {
    // so the latest sketch is available to the drawer
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    switch (controller.penMode) {
        case "select":
            if (selectBox) {
                //after moving selection
                let items = mainSketch.sketchLayer.getItems({
                    inside: selectBox.bounds,
                });
                let rect = items.pop();
                if (rect) {
                    rect.remove(); // can be undefined if flat box
                }
                items.forEach((item) => (item.selected = true));
                if (controller.selectBox) {
                    controller.selectBox = null;
                    selectBox.remove();
                    selectBox = null;
                }
                fitToSelection(items, "moving"); //try update
                // // IS THIS STILL NEEDED?
                // if (!getSelectedPaths().length) {
                //     path.remove();
                // }
                createGroup(items); //transformGroup
                updateSelectUI();
            }
            if (controller.boundingBox) {
                //after creating selection by dragging
                if (!controller.transformGroup.children.length) {
                    ungroup();
                    hideSelectUI();
                } else {
                    controller.boundingBox.data.state = "moving";
                }
            }
            break;
        case "pen":
            if (firstPoint && penPath.segments.length > 2) {
                firstPoint.remove();
            }
            penPath.simplify();

            penPath.data.fixed = false;
            // Update
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            // incrementHistory();

            setLineLabels(mainSketch.sketchLayer);
            if (socket) {
                if (controller.liveCollab) {
                    controller.continueSketch();
                    controller.liveCollab = false;
                } else if (!noPrompt() && controller.doneSketching !== null) {
                    //stopped with collab draw
                    {
                        clearTimeout(sketchTimer);
                        sketchTimer = setTimeout(() => {
                            controller.draw();
                            let time = (Math.floor(Math.random() * 5) + 5) * 1000;
                            setTimeout(() => {
                                console.log("drawing for: ", time);
                                controller.stop();
                                controller.clipDrawing = false;
                            }, time);
                        }, controller.doneSketching);
                    }
                }
            }

            break;
        case "local":
            regionPath.remove();

            if (
                controller.drawRegion.width > 78 &&
                controller.drawRegion.height > 30
            ) {
                const frameParent = new Path.Rectangle(controller.drawRegion);
                frameParent.set(frameOptions); //completed

                const [
                    frameContainer,
                    frameInput,
                    frameClose,
                    frameGrab,
                    cornerDrag,
                    col,
                ] = createFrame();
                const [tag, closeButton, text] = createFrameItem(col);

                const i = createUUID();

                frameInput.addEventListener("input", (e) => {
                    text.innerHTML = e.target.value;
                    mainSketch.localFrames[i].data.prompt = e.target.value;
                    document.getElementById("prompt-info").style.display = "none";
                });

                frameInput.addEventListener("blur", (e) => {
                    if (e.target.value === "") deleteFrame(i);
                });

                tag.addEventListener("click", (e) => {
                    frameInput.focus();
                    for (const key in mainSketch.localFrames) {
                        let item = mainSketch.localFrames[key];
                        item.tag.style.background = "";
                        item.frame.style.opacity = 1;
                    }
                    frameContainer.style.opacity = 0.9;
                    tag.style.background = "#413d60";
                });

                frameClose.addEventListener("click", (e) => {
                    deleteFrame(i);
                });

                closeButton.addEventListener("click", (e) => {
                    deleteFrame(i);
                });

                frameGrab.onmousedown = (e) => {
                    controller.pause();
                    ungroup();
                    let items = mainSketch.sketchLayer.getItems({
                        inside: frameParent.bounds,
                    });
                    createGroup(items);

                    if (window.innerWidth > 700) {
                        e = e || window.event;
                        pos3 = e.clientX;
                        pos4 = e.clientY;
                        document.onmouseup = () => {
                            document.onmouseup = null;
                            document.onmousemove = null;
                            ungroup();
                        };
                        document.onmousemove = (e) => {
                            elementDrag(e, frameContainer);
                            frameParent.position.x += e.movementX;
                            frameParent.position.y += e.movementY;

                            mainSketch.localFrames[i].data.points = {
                                x0: frameParent.bounds.topLeft.x,
                                y0: frameParent.bounds.topLeft.y,
                                x1: frameParent.bounds.bottomRight.x,
                                y1: frameParent.bounds.bottomRight.y,
                            };

                            controller.transformGroup.position.x += e.movementX;
                            controller.transformGroup.position.y += e.movementY;
                        };
                    }
                };

                frameInput.onmousedown = (e) => {
                    if (window.innerWidth > 700) {
                        e = e || window.event;
                        pos3 = e.clientX;
                        pos4 = e.clientY;
                        document.onmouseup = closeDragElement;
                        document.onmousemove = (e) => {
                            elementDrag(e, frameContainer);
                            frameParent.position.x += e.movementX;
                            frameParent.position.y += e.movementY;

                            mainSketch.localFrames[i].data.points = {
                                x0: frameParent.bounds.topLeft.x,
                                y0: frameParent.bounds.topLeft.y,
                                x1: frameParent.bounds.bottomRight.x,
                                y1: frameParent.bounds.bottomRight.y,
                            };
                        };
                    }
                };

                cornerDrag.onmousedown = (e) => {
                    if (window.innerWidth > 700) {
                        e = e || window.event;
                        pos3 = e.clientX;
                        pos4 = e.clientY;
                        document.onmouseup = closeDragElement;
                        document.onmousemove = (e) => {
                            // TODO update other rects to do this instead . didn't work?
                            let x = frameParent.bounds.width;
                            let y = frameParent.bounds.height;
                            if (x + e.movementX > 75) {
                                frameParent.bounds.width += e.movementX;
                            } else {
                                frameParent.bounds.width = 75;
                            }

                            if (y + e.movementY > 30) {
                                frameParent.bounds.height += e.movementY;
                            } else {
                                frameParent.bounds.height = 30;
                            }

                            frameContainer.style.width = frameParent.bounds.width + "px";
                            cornerDrag.style.top =
                                frameParent.bounds.height + frameContainer.clientHeight + "px";
                            cornerDrag.style.left = frameParent.bounds.width + "px";

                            mainSketch.localFrames[i].data.points = {
                                x0: frameParent.bounds.topLeft.x,
                                y0: frameParent.bounds.topLeft.y,
                                x1: frameParent.bounds.bottomRight.x,
                                y1: frameParent.bounds.bottomRight.y,
                            };

                            frameInput.focus();
                        };
                    }
                };

                mainSketch.localFrames[i] = {
                    tag: tag,
                    frame: frameContainer,
                    paperFrame: frameParent,
                    data: {
                        prompt: "default",
                        points: {
                            x0: frameParent.bounds.topLeft.x,
                            y0: frameParent.bounds.topLeft.y,
                            x1: frameParent.bounds.bottomRight.x,
                            y1: frameParent.bounds.bottomRight.y,
                        },
                    },
                };

                frameContainer.querySelector("input").focus();
            } else {
                alert(
                    `Minimum focus frame is 78x30: You draw a frame with size ${controller.drawRegion.width}x${controller.drawRegion.height}`
                );
            }
            break;
        case "erase":
            if (firstErasePoint && erasorPath.segments.length > 2) {
                firstErasePoint.remove();
            }
            erasorPath.simplify();
            const eraseRadius = controller.strokeWidth;
            const outerPath = OffsetUtils.offsetPath(erasorPath, eraseRadius);
            const innerPath = OffsetUtils.offsetPath(erasorPath, -eraseRadius);
            erasorPath.remove();
            outerPath.insert = false;
            innerPath.insert = false;
            innerPath.reverse();
            let deleteShape = new Path({
                closed: true,
                insert: false,
            });
            deleteShape.addSegments(outerPath.segments);
            deleteShape.addSegments(innerPath.segments);
            const endCaps = new CompoundPath({
                children: [
                    new Path.Circle({
                        center: erasorPath.firstSegment.point,
                        radius: eraseRadius,
                    }),
                    new Path.Circle({
                        center: erasorPath.lastSegment.point,
                        radius: eraseRadius,
                    }),
                ],
                insert: false,
            });
            deleteShape = deleteShape.unite(endCaps);
            deleteShape.simplify();

            const erasorItems = tmpGroup.getItems({
                overlapping: deleteShape.bounds,
            });
            erasorItems.forEach(function(erasorItem) {
                const result = erasorItem.subtract(deleteShape, {
                    trace: false,
                    insert: false,
                });
                if (result.children) {
                    //split path
                    let splitPaths = result.removeChildren();
                    erasorItem.parent.insertChildren(erasorItem.index, splitPaths);

                    // splitPaths.forEach((newPath) => {
                    //     newPath.data.fixed = true;
                    // });

                    erasorItem.remove();
                    result.remove(); //remove the compound paths
                } else {
                    // don't split
                    if (!result.segments.length) {
                        console.log("Removed");
                        erasorItem.remove();
                        result.remove();
                    } else {
                        erasorItem.replaceWith(result); //replace
                        // result.data.fixed = true;
                    }
                }
            });

            mainSketch.sketchLayer.addChildren(tmpGroup.removeChildren());
            mask.remove();

            // Update
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(mainSketch.sketchLayer);
            if (controller.liveCollab) {
                controller.continueSketch();
                controller.liveCollab = false;
            }
            break;
    }

    // Save
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    setLineLabels(mainSketch.sketchLayer);
    // logger.event(controller.penMode + "-up");
};

const setPenMode = (mode) => {
    if (mode !== "dropper") {
        let tools = document.querySelectorAll(".window-tool");
        tools.forEach((tool) => {
            tool.classList.remove("current-tool");
        });
    }

    switch (mode) {
        case "erase":
            selectTool.classList.remove("selected");
            eraseTool.classList.add("selected");
            penTool.classList.remove("selected");
            document.querySelector(".erase-preview").classList.add("current-tool");
            canvas.style.cursor = "url('public/erase.svg') 8 11, move";
            controller.penMode = mode;
            break;
        case "pen":
            selectTool.classList.remove("selected");
            eraseTool.classList.remove("selected");
            penTool.classList.add("selected");
            document.querySelector(".pencil-preview").classList.add("current-tool");

            canvas.style.cursor = "url('public/pen.svg') -1 20, move";

            let swatches = document.getElementById("swatches");

            if (window.innerWidth < 700) {
                if (swatches.style.display !== "flex") {
                    swatches.style.display = "flex";
                    swatches.style.top =
                        document.getElementById("pen-controls").getBoundingClientRect()
                        .bottom +
                        5 +
                        "px";
                } else {
                    swatches.style.display = "none";
                }
            }
            controller.penMode = mode;
            "pen";
            break;
        case "select":
            selectTool.classList.add("selected");
            eraseTool.classList.remove("selected");
            penTool.classList.remove("selected");
            document.querySelector(".finger-preview").classList.add("current-tool");

            canvas.style.cursor = "url('public/select.svg') 3 2, move";
            controller.penMode = mode;
            break;
        case "local":
            canvas.style.cursor = "crosshair";
            controller.penMode = mode;
            break;
        case "dropper":
            canvas.style.cursor = "url('public/dropper.svg') -1 20, move";
            controller.penMode = mode;
    }

    if (controller.penMode !== "select" && controller.penMode !== "dropper") {
        ungroup();
        mainSketch.sketchLayer.getItems().forEach((path) => {
            path.selected = false;
        });
    }
    if (controller.penMode !== "local" && controller.penMode !== "select") {
        controller.drawRegion = undefined;
        if (regionPath) regionPath.remove();
        // penDrop.classList.remove("selected-mode");
    }

    if (controller.penMode !== "local") {
        mainSketch.sketchLayer.activate();
    }

    if (controller.penMode !== "dropper") {
        eyeDropper.style.color = "#363636";
    }
};
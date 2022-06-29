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
    sketchHistory.pushUndo();

    switch (controller.penMode) {
        case "select":
            path = null;
            let hitResult = mainSketch.sketchLayer.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 4,
            });

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
                pauseActiveDrawer();
                ungroup();

                path = hitResult.item;
                path.selected = true;
                let items = getSelectedPaths();
                createGroup(items);
                fitToSelection(items, "moving");
                updateSelectUI();
            }
            break;
        case "pen":
            pauseActiveDrawer();

            penPath = new Path({
                strokeColor: controller.strokeColor,
                strokeWidth: controller.strokeWidth,
                opacity: controller.opacity,
                strokeCap: "round",
                strokeJoin: "round",
            });
            firstPoint = penPath.add(event.point);
            penPath.add({
                ...event.point,
                x: event.point.x + 0.001,
            }); //make a segment on touch down (one point)
            break;
        case "lasso":
            controller.drawRegion = new Rectangle(event.point);
            break;
        case "erase":
            pauseActiveDrawer();

            erasorPath = new Path({
                strokeWidth: controller.strokeWidth * 5,
                strokeCap: "round",
                strokeJoin: "round",
                opacity: 0.85,
                strokeColor: "rgb(255,0, 0)",
            });
            firstErasePoint = erasorPath.add(event.point);
            erasorPath.add({
                ...event.point,
                x: event.point.x + 0.001,
            }); //make a segment on touch down (one point)
            tmpGroup = new Group({
                children: userLayer.removeChildren(),
                blendMode: "source-out",
                insert: false,
            });
            mask = new Group({
                children: [erasorPath, tmpGroup],
                blendMode: "source-over",
            });
            break;
        case "dropper":
            console.log("test");
            // const raster = mainSketch.sketchLayer.rasterize();
            // raster.position.x += 100;

            // let col = raster.getPixel(event.point);
            // console.log(col);
            // controller.strokeColor = col;
            // picker.setColor(col);

            // // raster.remove();

            // var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
            // var cornerSize = new Size(10, 10);
            // var path = new Path.Rectangle(rectangle, cornerSize);
            // path.fillColor = col;
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
                    controller.transformGroup.children.forEach((path) => {
                        mainSketch.userPathList = mainSketch.userPathList.filter(
                            (item) => item !== path
                        ); //remove old ref
                        mainSketch.userPathList.push(path);
                        path.opacity = 1;
                    });
                    updateSelectUI();
                }
            } else if (controller.selectBox !== undefined) {
                //creating box
                pauseActiveDrawer();
                controller.selectBox.width += event.delta.x;
                controller.selectBox.height += event.delta.y;
                if (selectBox) {
                    selectBox.remove();
                } // redraw //REFACTOR
                selectBox = new Path.Rectangle(controller.selectBox);
                selectBox.set({
                    fillColor: "#f5f5f5",
                    opacity: 0.4,
                    strokeColor: "#7b66ff",
                    selected: true,
                });
            }
            break;
        case "lasso":
            controller.drawRegion.width += event.delta.x;
            controller.drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); //remove old one. maybe could update the old one instead?
            regionPath = new Path.Rectangle(controller.drawRegion);
            regionPath.set({
                // fillColor: "#e9e9ff",
                fillColor: "#f5f5f5",
                opacity: 0.4,
                strokeColor: "#7b66ff",
                selected: true,
            });
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
                //after moving
                //moving selection
                let items = userLayer.getItems({ inside: selectBox.bounds });
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
                let path = fitToSelection(items, "moving"); //try update
                // IS THIS STILL NEEDED?
                if (!getSelectedPaths().length) {
                    path.remove();
                }
                createGroup(items); //transformGroup
                updateSelectUI();
            }
            if (controller.boundingBox) {
                //after creating selection by dragging
                if (!getSelectedPaths().length) {
                    ungroup();
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

            mainSketch.userPathList.push(penPath);

            // Update
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
            if (controller.liveCollab) {
                controller.continueSketch();
                controller.liveCollab = false;
            } else if (!noPrompt() && controller.doneSketching !== null && socket) {
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

            break;
        case "lasso":
            if (socket) {
                regionPath.remove();
                controller.resetMetaControls(); //reset since not continuing
                controller.draw(true);
                console.log(userLayer);
            }
            break;
        case "erase":
            if (firstErasePoint && erasorPath.segments.length > 2) {
                firstErasePoint.remove();
            }
            erasorPath.simplify();
            const eraseRadius = (controller.strokeWidth * 5) / 2;
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
                    let newList = [];
                    let foundUserPath = false;
                    for (let i = 0; i < mainSketch.userPathList.length; i++) {
                        if (mainSketch.userPathList[i] === erasorItem) {
                            splitPaths.forEach((newPath) => {
                                newList.push(newPath); // replace
                            });
                            foundUserPath = true;
                        } else {
                            newList.push(mainSketch.userPathList[i]);
                        }
                    }
                    if (!foundUserPath) {
                        //ai erasorItem
                        splitPaths.forEach((newPath) => {
                            newPath.opacity = 1;
                            newPath.strokeColor.alpha = 1;
                            newList.push(newPath);
                        });
                    }

                    mainSketch.userPathList = newList;
                    erasorItem.remove();
                    result.remove(); //remove the compound paths
                } else {
                    // don't split
                    if (result.length === 0) {
                        mainSketch.userPathList = mainSketch.userPathList.filter(
                            (ref) => ref !== erasorItem
                        ); //remove ref
                        erasorItem.remove();
                    } else {
                        mainSketch.userPathList = mainSketch.userPathList.filter(
                            (ref) => ref !== erasorItem
                        );
                        erasorItem.replaceWith(result); //replace
                        mainSketch.userPathList.push(result); //replace
                    }
                }
            });

            let added = userLayer.addChildren(tmpGroup.removeChildren());
            mask.remove();

            if (added.length) {
                added.forEach((item) => {
                    if (item instanceof Group) {
                        if (!item.segments.length) {
                            item.remove();
                        }
                    }
                });
            }

            // Update
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
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
    setLineLabels(userLayer);
    logger.event(controller.penMode + "-up");

    console.log(userLayer);
    console.log(mainSketch.userPathList);
};

const setPenMode = (mode, accentTarget) => {
    let lastPenMode = controller.penMode;
    document.querySelectorAll(".pen-mode").forEach((mode) => {
        mode.classList.remove("selected-mode");
        mode.classList.add("simple-hover");
    });

    if (accentTarget) {
        accentTarget.classList.add("selected-mode");
        accentTarget.classList.remove("simple-hover");
    }
    switch (mode) {
        case "pen-drop":
            if (useAI) {
                if (dropdown.style.display !== "flex") {
                    dropdown.style.display = "flex";
                    dropdown.style.top =
                        buttonPanel.getBoundingClientRect().bottom + "px";
                    dropdown.style.left =
                        penDrop.getBoundingClientRect().left +
                        penDrop.getBoundingClientRect().width / 2 +
                        "px";
                    setPenMode(controller.penDropMode, penDrop);
                } else {
                    dropdown.style.display = "none";
                }
            } else {
                setPenMode("select", penDrop);
            }

            break;
        case "erase":
            if (useAI) {
                dropdown.style.display = "none";
            }
            controller.penMode = mode;
            break;
        case "pen":
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
            dropdown.style.display = "none";
            controller.penMode = mode;
            "pen";
            break;
        case "select":
            penDrop.classList.add("selected-mode");
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.remove("fa-object-group");
            penDrop.classList.add("fa-arrow-pointer");
            controller.penMode = mode;
            controller.penDropMode = mode;
            break;
        case "lasso":
            if (noPrompt()) {
                controller.penMode = lastPenMode;
                openModal({
                    title: "Add a prompt first!",
                    message: "You need a prompt to generate sketches with the region tool.",
                    confirmAction: () => (controlPanel.style.display = "flex"),
                });
            } else {
                penDrop.classList.add("selected-mode");
                penDrop.classList.remove("fa-eraser");
                penDrop.classList.remove("fa-arrow-pointer");
                penDrop.classList.add("fa-object-group");
                controller.penMode = mode;
                controller.penDropMode = mode;
            }
            break;
        case "dropper":
            controller.penMode = mode;
            document.getElementById("dropper").style.color = "#ffffff";
    }

    if (controller.penMode !== "select") {
        ungroup();
        userLayer.getItems().forEach((path) => {
            path.selected = false;
        });
    }
    if (controller.penMode !== "lasso" && controller.penMode !== "select") {
        controller.drawRegion = undefined;
        if (regionPath) regionPath.remove();
        penDrop.classList.remove("selected-mode");
    }
    // if (controller.penMode !== "dropper") {
    // document.getElementById("dropper").style.color = "#363636";
    // REMOVE LISTENR
    // }
};
//TODO Combine multitool and erasor into single tool

let sketchTimer;

multiTool.onMouseDown = function(event) {
    // refactor for multitouch
    clearTimeout(sketchTimer);
    // controller.resetMetaControls();

    switch (controller.penMode) {
        case "select":
            console.log(userLayer);

            path = null;
            let hitResult = paper.project.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 4,
            });

            // TO change to simple hit test
            let isInBounds = null;
            if (controller.boundingBox) {
                isInBounds =
                    event.point.x > controller.boundingBox.bounds.left &&
                    event.point.x < controller.boundingBox.bounds.right &&
                    event.point.y > controller.boundingBox.bounds.top &&
                    event.point.y < controller.boundingBox.bounds.bottom;
            }

            // DESELECT
            if ((!hitResult && !isInBounds) || (!hitResult && isInBounds == null)) {
                hideSelectUI();
                // Clean up group
                unpackGroup();
                userLayer.getItems().forEach((path) => {
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
                setLineLabels(userLayer);

                // Continue
                if (liveCollab) {
                    controller.continueSketch();
                    liveCollab = false;
                }
                controller.selectBox = new Rectangle(event.point);
            }

            if (hitResult) {
                pauseActiveDrawer();

                // got path
                if (controller.boundingBox) {
                    hideSelectUI();
                }
                unpackGroup();
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

            myPath = new Path({
                strokeColor: controller.strokeColor,
                strokeWidth: controller.strokeWidth,
                opacity: controller.opacity,
                strokeCap: "round",
                strokeJoin: "round",
            });
            myPath.add(event.point);
            myPath.add({
                ...event.point,
                x: event.point.x + 0.001,
            }); //make a segment on touch down (one point)
            break;
        case "lasso":
            controller.drawRegion = new Rectangle(event.point);
            break;
    }
};

multiTool.onMouseDrag = function(event) {
    switch (controller.penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            if (controller.boundingBox) {
                //moving box
                if (controller.boundingBox.data.state === "moving") {
                    const selectedPaths = getSelectedPaths(); // all selected
                    selectedPaths[0].children.forEach((path) => {
                        path.position.x += event.delta.x;
                        path.position.y += event.delta.y;
                        mainSketch.userPathList = mainSketch.userPathList.filter(
                            (item) => item !== path
                        ); //remove ref
                        mainSketch.userPathList.push(path);
                        path.opacity = 1;
                    });
                    controller.boundingBox.position.x += event.delta.x;
                    controller.boundingBox.position.y += event.delta.y;
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
            if (regionPath !== undefined) regionPath.remove(); // redraw //REFACTOR
            regionPath = new Path.Rectangle(controller.drawRegion);
            regionPath.set({
                // fillColor: "#e9e9ff",
                fillColor: "#f5f5f5",
                opacity: 0.4,
                strokeColor: "#7b66ff",
                selected: true,
            });
            // Start draw
            break;
    }
};

multiTool.onMouseUp = function() {
    // so the latest sketch is available to the drawer
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    switch (controller.penMode) {
        case "select":
            if (selectBox) {
                //moving selection
                let items = userLayer.getItems({ inside: selectBox.bounds });
                items.pop().remove();
                items.forEach((item) => (item.selected = true));
                if (controller.selectBox) {
                    controller.selectBox = null;
                    selectBox.remove();
                    selectBox = null;
                }
                let path = fitToSelection(items, "moving"); //try update
                if (!getSelectedPaths().length) {
                    path.remove();
                }
                createGroup(items); //transformGroup
                updateSelectUI();
            }
            // console.log("LAYER ", userLayer.children);
            // console.log("Ref: ", mainSketch.userPathList);
            break;
        case "pen":
            myPath.simplify();
            // sendPaths();
            controller.stack.undoStack.push({
                type: "draw-event",
                data: myPath,
            });

            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });

            mainSketch.userPathList.push(myPath);

            if (liveCollab) {
                controller.continueSketch();
                liveCollab = false;
            } else {
                //just drawing
                if (!noPrompt() &&
                    controller.doneSketching !== null &&
                    socketConnected
                ) {
                    clearTimeout(sketchTimer);
                    sketchTimer = setTimeout(userStuck, controller.doneSketching);

                    function userStuck() {
                        controller.draw();
                    }
                }
            }
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
            break;
        case "lasso":
            if (socketConnected) {
                controller.resetSketch(); //reset since not continuing
                controller.draw(true);
                controller.clipDrawing = true;
                regionPath.remove();
            }
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
            break;
    }
    // remove??
    if (controller.boundingBox) {
        controller.boundingBox.data.state = "moving";
    }

    logger.event(controller.penMode + "-up");
};

eraseTool.onMouseDown = function(event) {
    pauseActiveDrawer();
    // controller.resetMetaControls();

    controller.stack.undoStack.push({
        type: "erase-event",
        data: userLayer.exportJSON(),
    });
    erasorPath = new Path({
        strokeWidth: controller.strokeWidth * 5,
        strokeCap: "round",
        strokeJoin: "round",
        opacity: 0.85,
        strokeColor: "rgb(255,0, 0)",
    });
    tmpGroup = new Group({
        children: userLayer.removeChildren(),
        blendMode: "source-out",
        insert: false,
    });
    mask = new Group({
        children: [erasorPath, tmpGroup],
        blendMode: "source-over",
    });
};

eraseTool.onMouseDrag = function(event) {
    erasorPath.add(event.point);
};

eraseTool.onMouseUp = function(event) {
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
    userLayer.addChildren(tmpGroup.removeChildren());
    mask.remove();

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    setLineLabels(userLayer);

    logger.event("erase-up");

    if (liveCollab) {
        controller.continueSketch();
        liveCollab = false;
    }
};
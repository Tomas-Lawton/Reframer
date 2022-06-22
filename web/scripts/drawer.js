//TODO Combine multitool and erasor into single tool

let sketchTimer;

multiTool.onMouseDown = function(event) {
    // refactor for multitouch
    clearTimeout(sketchTimer);
    sketchController.resetMetaControls();

    switch (sketchController.penMode) {
        case "select":
            path = null;
            let hitResult = paper.project.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 4,
            });

            // TO change to simple hit test
            let isInBounds = null;
            if (sketchController.boundingBox) {
                isInBounds =
                    event.point.x > sketchController.boundingBox.bounds.left &&
                    event.point.x < sketchController.boundingBox.bounds.right &&
                    event.point.y > sketchController.boundingBox.bounds.top &&
                    event.point.y < sketchController.boundingBox.bounds.bottom;
            }

            // DESELECT
            if ((!hitResult && !isInBounds) || (!hitResult && isInBounds == null)) {
                hideSelectUI();

                // Clean up group
                unpackGroup();
                userLayer.getItems().forEach((path) => {
                    path.selected = false;
                });

                if (sketchController.transformGroup !== null) {
                    sketchController.transformGroup.remove();
                    sketchController.transformGroup = null;
                }

                // Update
                sketchController.svg = paper.project.exportSVG({
                    asString: true,
                });
                setLineLabels(userLayer);

                // Prepare
                if (liveCollab) {
                    sketchController.continueSketch();
                    liveCollab = false;
                }

                sketchController.selectBox = new Rectangle(event.point);
            }

            if (hitResult) {
                pauseActiveDrawer();

                // got path
                if (sketchController.boundingBox) {
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
                strokeColor: sketchController.strokeColor,
                strokeWidth: sketchController.strokeWidth,
                opacity: sketchController.opacity,
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
            sketchController.drawRegion = new Rectangle(event.point);
            break;
    }
};

multiTool.onMouseDrag = function(event) {
    switch (sketchController.penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            if (sketchController.boundingBox) {
                if (sketchController.boundingBox.data.state === "moving") {
                    const selectedPaths = getSelectedPaths(); // all selected
                    selectedPaths[0].children.forEach((path) => {
                        path.position.x += event.delta.x;
                        path.position.y += event.delta.y;
                        if (!sketchController.userPaths.includes(path)) {
                            sketchController.userPaths.push(path);
                            path.opacity = 1;
                        }
                    });
                    sketchController.boundingBox.position.x += event.delta.x;
                    sketchController.boundingBox.position.y += event.delta.y;
                    updateSelectUI();
                }
            } else if (sketchController.selectBox != undefined) {
                sketchController.selectBox.width += event.delta.x;
                sketchController.selectBox.height += event.delta.y;
                if (selectBox) {
                    selectBox.remove();
                } // redraw //REFACTOR
                selectBox = new Path.Rectangle(sketchController.selectBox);
                selectBox.set({
                    fillColor: "#f5f5f5",
                    opacity: 0.4,
                    strokeColor: "#7b66ff",
                    selected: true,
                });
            }
            break;
        case "lasso":
            sketchController.drawRegion.width += event.delta.x;
            sketchController.drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw //REFACTOR
            regionPath = new Path.Rectangle(sketchController.drawRegion);
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
    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });

    switch (sketchController.penMode) {
        case "select":
            if (selectBox) {
                //moving selection
                console.log("here");
                let items = userLayer.getItems({ inside: selectBox.bounds });
                items.pop().remove();
                items.forEach((item) => (item.selected = true));

                if (sketchController.selectBox) {
                    sketchController.selectBox = null;
                    selectBox.remove();
                    selectBox = null;
                }
                fitToSelection(items, "moving");
                createGroup(items);
                updateSelectUI();
            }
            //has a group
            console.log("LAYER ", userLayer.children);
            console.log("Ref: ", sketchController.userPaths);
            break;
        case "pen":
            myPath.simplify();
            // sendPaths();
            sketchController.stack.undoStack.push({
                type: "draw-event",
                data: myPath,
            });

            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });

            sketchController.userPaths.push(myPath);

            if (liveCollab) {
                sketchController.continueSketch();
                liveCollab = false;
            } else {
                //just drawing
                if (!noPrompt() &&
                    sketchController.doneSketching !== null &&
                    socketConnected
                ) {
                    clearTimeout(sketchTimer);
                    sketchTimer = setTimeout(userStuck, sketchController.doneSketching);

                    function userStuck() {
                        sketchController.draw();
                    }
                }
            }
            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
            break;
        case "lasso":
            if (socketConnected) {
                sketchController.resetSketch(); //reset since not continuing
                sketchController.draw(true);
                sketchController.clipDrawing = true;
                regionPath.remove();
            }
            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });
            setLineLabels(userLayer);
            break;
    }
    // remove??
    if (sketchController.boundingBox) {
        sketchController.boundingBox.data.state = "moving";
    }

    logger.event(sketchController.penMode + "-up");
};

eraseTool.onMouseDown = function(event) {
    pauseActiveDrawer();
    sketchController.resetMetaControls();

    sketchController.stack.undoStack.push({
        type: "erase-event",
        data: userLayer.exportJSON(),
    });
    erasorPath = new Path({
        strokeWidth: sketchController.strokeWidth * 5,
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
    const eraseRadius = (sketchController.strokeWidth * 5) / 2;
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
            splitPaths = result.removeChildren();
            erasorItem.parent.insertChildren(erasorItem.index, splitPaths);

            let newList = [];
            let foundUserPath = false;
            for (let i = 0; i < sketchController.userPaths.length; i++) {
                if (sketchController.userPaths[i] === erasorItem) {
                    splitPaths.forEach((newPath) => {
                        // replace old ref with the new children
                        newList.push(newPath);
                    });
                    foundUserPath = true;
                } else {
                    newList.push(sketchController.userPaths[i]);
                }
            }
            if (!foundUserPath) {
                // children should be added to the end, no need to delete old ref
                splitPaths.forEach((newPath) => {
                    newPath.opacity = 1;
                    newList.push(newPath);
                });
            }

            sketchController.userPaths = newList;
            erasorItem.remove();
            result.remove(); //remove the compound paths
        } else {
            // don't split
            if (result.length === 0) {
                sketchController.userPaths = sketchController.userPaths.filter(
                    (ref) => ref !== erasorItem
                ); //remove ref
                erasorItem.remove();
            } else {
                if (!sketchController.userPaths.includes(erasorItem)) {
                    result.opacity = 1;
                    sketchController.userPaths.push(result);
                }
                erasorItem.replaceWith(result);
            }
        }
    });
    userLayer.addChildren(tmpGroup.removeChildren());
    mask.remove();

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
    setLineLabels(userLayer);

    logger.event("erase-up");

    if (liveCollab) {
        sketchController.continueSketch();
        liveCollab = false;
    }
};
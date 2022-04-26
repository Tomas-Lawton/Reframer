multiTool.onMouseDown = function(event) {
    // refactor for multitouch
    switch (penMode) {
        case "select":
            path = null;
            let hitResult = paper.project.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
            });
            if (!hitResult) {
                userLayer.getItems().forEach((path) => {
                    console.log(path);
                    path.selected = false;
                });
                return;
            }
            if (hitResult) {
                path = hitResult.item;
                path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected
            }
            break;
        case "pen":
            myPath = new Path({
                strokeColor: strokeColor,
                strokeWidth: strokeWidth,
                opacity: opacity,
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
            drawRegion = new Rectangle(event.point);
            break;
    }
};
multiTool.onMouseDrag = function(event) {
    switch (penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            const selectedPaths = getSelectedPaths(); // all selected
            console.log(selectedPaths);
            selectedPaths.forEach((path) => {
                path.position.x += event.delta.x;
                path.position.y += event.delta.y;
            });
            break;
        case "lasso":
            drawRegion.width += event.delta.x;
            drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw
            regionPath = new Path.Rectangle(drawRegion);
            regionPath.set({
                fillColor: "#e9e9ff",
                opacity: 0.4,
                selected: true,
            });
            // Start draw
            break;
    }
};
multiTool.onMouseUp = function(event) {
    switch (penMode) {
        case "pen":
            myPath.simplify();
            // sendPaths();
            undoStack.push({
                type: "draw-event",
                data: myPath,
            });
            break;
        case "lasso":
            resetHistory(); //reset since not continuing
            startDrawing(prompt.value === lastPrompt ? "redraw" : "draw", true);
            clipDrawing = true;
            break;
    }
};

eraseTool.onMouseDown = function(event) {
    erasorPath = new Path({
        strokeWidth: strokeWidth * 2,
        strokeCap: "round",
        strokeJoin: "round",
        strokeColor: "white",
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
    const eraseRadius = (strokeWidth * 2) / 2;
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
    console.log(tmpGroup.getItems((erasorItem) => console.log(erasorItem)));

    const erasorItems = tmpGroup.getItems({
        overlapping: deleteShape.bounds,
    });

    erasorItems.forEach(function(erasorItem) {
        const result = erasorItem.subtract(deleteShape, {
            trace: false,
            insert: false,
        });
        if (result.children) {
            erasorItem.parent.insertChildren(
                erasorItem.index,
                result.removeChildren()
            );
            erasorItem.remove();
        } else {
            if (result.length === 0) {
                erasorItem.remove();
            } else {
                erasorItem.replaceWith(result);
            }
        }
    });
    userLayer.addChildren(tmpGroup.removeChildren());
    mask.remove();
};
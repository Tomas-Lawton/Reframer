const spark = new PaperScope();
spark.setup(sparkCanvas);
spark.activate();

const easing = 0.985;
const sparkPath = new Path({
    strokeColor: "#7B66FF",
    strokeWidth: 3,
    strokeCap: "round",
});

// let startPoint = new Point(0, spark.view.bounds.centerY);
let secondPoint = new Point(spark.view.bounds.left, spark.view.bounds.centerY);
// sparkPath.add(startPoint);
sparkPath.add(secondPoint);

let renderShape;

spark.view.onFrame = () => {
    if (
        (controller.drawState === "draw" || controller.drawState === "draw") &&
        mainSketch.semanticLoss
    ) {
        let newY = scaleRange(mainSketch.semanticLoss, -1, 0, 0, 150);
        let dy = sparkPath.lastSegment.point.y - newY;
        newY += dy * easing;
        sparkPath.position.x -= 0.3;
        sparkKnob.style.top = newY + "px";
        let nextPoint = new Point(spark.view.bounds.right, newY);
        sparkPath.add(nextPoint);
        sparkPath.smooth();

        if (renderShape) renderShape.remove();
        renderShape = sparkPath.clone();
        renderShape.firstSegment.point.x -= 1.5;

        let bottomLeftPoint = new Point(
            sparkPath.firstSegment.point.x - 1.5,
            spark.view.bounds.bottom
        );
        let bottomRightPoint = new Point(
            spark.view.bounds.right,
            spark.view.bounds.bottom
        );
        let bl = renderShape.insert(0, bottomLeftPoint);
        let br = renderShape.add(bottomRightPoint);
        new Path.Line({ from: bl, to: br }); //connect
        renderShape.set({ fillColor: "#DDD6FF", strokeColor: null });

        renderShape.sendToBack();
    }
    mainScope.activate(); //return to main
};
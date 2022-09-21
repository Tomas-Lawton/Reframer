const spark = new PaperScope();
spark.setup(sparkCanvas);
spark.activate();

const easing = 0.98;
const speed = 0.6;

let renderShape;
let pointA = new Point(0, spark.view.bounds.centerY);
let pointB = new Point(spark.view.bounds.right, spark.view.bounds.centerY);
console.log(pointA);
console.log(pointB);

const createSparkShadow = () => {
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
};

const sparkPath = new Path({
    strokeColor: "#7B66FF",
    strokeWidth: 3,
    strokeCap: "round",
});
sparkPath.add(pointA);
sparkPath.add(pointB);
createSparkShadow();

spark.view.onFrame = () => {
    if (
        (controller.drawState === "draw" || controller.drawState === "draw") &&
        mainSketch.semanticLoss
    ) {
        let newY = scaleRange(mainSketch.semanticLoss, -1, 0, 0, 150);
        let dy = sparkPath.lastSegment.point.y - newY;
        newY += dy * easing;
        sparkPath.position.x -= speed;
        sparkKnob.style.top = newY + "px";

        sparkPath.add(new Point(spark.view.bounds.right, newY));
        createSparkShadow();
    }
    mainScope.activate(); //return to main
};
rotateSlider.oninput = (e) =>
    transformGroup(controller.transformGroup, "rotation", e.target.value);
rotateNumber.oninput = (e) =>
    transformGroup(controller.transformGroup, "rotation", e.target.value);
scaleSlider.oninput = (e) =>
    transformGroup(controller.transformGroup, "scaling", e.target.value / 5);
scaleNumber.oninput = (e) =>
    transformGroup(controller.transformGroup, "scaling", e.target.value / 5);
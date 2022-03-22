# BE Web Application/Server Code

Fast api prevents a business logic layer to interact for processing input from the web interface frontend. The server instantiates the CLIP model and can be configured as an image classifier or text classifier. Outputs come in the form of images or classes and can be fed back to the CLIP handler as new inputs.

The plot utility file helps with testing different aspects of the model.

## Image Classification

Given an image or set of images, CLIP returns the likely classes of the images. This can be used as a zero-shot classifier with 2000 classes, or by manually setting a group of classes each with at least one corresponding image. Additionally, we can load selected images by name, or load all given images.

### Classification with classes:

If there are more images than classes, clip does not perform well because clip incorrectly identifies some images, and there are not enough classes for each image. Therefore, ensure each image has a class by checking the image name has a description (in the description property and can be randomised), or make sure there are enough classes. If there are equal or more classes than images, high cosine similarity is given to the correct images so they are classified correctly.

### Classification with zero shot

Zero shot does not require names or descriptions because there are already enough classes to classify all the images.

## Text Classification

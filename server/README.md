# BE Web Application/Server Code

Fast api prevents a business logic layer to interact for processing input from the web interface frontend. The server instantiates the CLIP model and can be configured as an image classifier or text classifier. Outputs come in the form of images or classes and can be fed back to the CLIP handler as new inputs.

## Image Classification

Given an image or set of images, CLIP returns the likely classes of the images. This can be used as a zero-shot classifier with 2000 classes, or by manually setting a group of classes each with at least one corresponding image. Additionally, we can load selected images by name, or load all given images.

## Text Classification

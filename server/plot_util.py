import matplotlib
matplotlib.use('agg') # non interactive with fast api

from matplotlib import pyplot as plt
import numpy as np

def plot_cosines(clip_model): # change to just model
    description_count = len(clip_model.descriptions)
    similarity = clip_model.similarity
    images = clip_model.unprocessed_images
    classes = clip_model.classes

    plt.figure(figsize=(20, 14))
    plt.imshow(similarity, vmin=0.1, vmax=0.3)
    # plt.colorbar()
    plt.yticks(range(description_count), classes, fontsize=18)
    plt.xticks([])
    for i, image in enumerate(images):
        plt.imshow(image, extent=(i - 0.5, i + 0.5, -1.6, -0.6), origin="lower")
    for x in range(similarity.shape[1]):
        for y in range(similarity.shape[0]):
            plt.text(x, y, f"{similarity[y, x]:.2f}", ha="center", va="center", size=12)

    for side in ["left", "top", "right", "bottom"]:
        plt.gca().spines[side].set_visible(False)

    plt.xlim([-0.5, description_count - 0.5])
    plt.ylim([description_count + 0.5, -2])

    plt.title("Cosine similarity between text and image features", size=20)
    plt.savefig('plot/my_plot.png')

def plot_zero_shot_images(clip_model):
    top_probs, top_labels = clip_model.similarity.cpu().topk(5, dim=-1)
    images = clip_model.unprocessed_images
    classes = clip_model.classes

    plt.figure(figsize=(16, 16))
    for i, image in enumerate(images):
        plt.subplot(4, 4, 2 * i + 1)
        plt.imshow(image)
        plt.axis("off")

        plt.subplot(4, 4, 2 * i + 2)
        y = np.arange(top_probs.shape[-1])
        plt.grid()
        plt.barh(y, top_probs[i])
        plt.gca().invert_yaxis()
        plt.gca().set_axisbelow(True)
        plt.yticks(y, [classes[index] for index in top_labels[i].numpy()])
        plt.xlabel("probability")
    plt.subplots_adjust(wspace=0.5)
    plt.savefig('plot/zero-shot-classify.png')
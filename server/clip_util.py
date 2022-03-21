import numpy as np
import torch
import clip

def enable_gpu():
    # do an enviromnet check here
    print("Torch version:", torch.__version__)
    assert torch.__version__.split(".") >= ["1", "7", "1"], "PyTorch 1.7.1 or later is required"
    return

def load_model_defaults():
    clip.available_models()
    model, preprocess = clip.load("ViT-B/32")
    # model.cuda().eval()
    input_resolution = model.visual.input_resolution
    context_length = model.context_length
    vocab_size = model.vocab_size

    print("Model parameters:", f"{np.sum([int(np.prod(p.shape)) for p in model.parameters()]):,}")
    print("Input resolution:", input_resolution)
    print("Context length:", context_length)
    print("Vocab size:", vocab_size)
    return model, preprocess

def run_preprocess(preprocess):
    preprocess
    print("Preprocess complete")
    return
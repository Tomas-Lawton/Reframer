import numpy as np
import torch
import clip
import logging

def load_model_defaults():
    logging.info(f"Torch version: {torch.__version__}")
    assert torch.__version__.split(".") >= ["1", "7", "1"], "PyTorch 1.7.1 or later is required"

    # TODO: Add option to use gpu or cpu depending on machine and torch on model load

    logging.info(f"Select from these models: \n{clip.available_models()}")
    model, preprocess = clip.load("ViT-B/32")
    # model.cuda().eval()
    input_resolution = model.visual.input_resolution
    context_length = model.context_length
    vocab_size = model.vocab_size

    logging.info(f"Model parameters: {np.sum([int(np.prod(p.shape)) for p in model.parameters()]):,}")
    logging.info(f"Input resolution: {input_resolution}")
    logging.info(f"Context length: {context_length}")
    logging.info(f"Vocab size: {vocab_size}")
    return model, preprocess

def run_preprocess(preprocess):
    preprocess
    print("Preprocess complete")
    return
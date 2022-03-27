#!/bin/bash
#after setup, just use conda env without pip
CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh
conda activate conda_env
uvicorn main:app --reload


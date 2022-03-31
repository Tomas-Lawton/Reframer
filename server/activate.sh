#!/bin/bash
#after setup, just use conda env without pip
deactivate
CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh
conda activate
uvicorn main:app --reload


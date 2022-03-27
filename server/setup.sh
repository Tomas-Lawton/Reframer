#!/bin/bash
conda create --name conda_env -y -y
conda activate conda-env
conda install --file requirements.txt
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt

source ./activate.sh
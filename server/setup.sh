#!/bin/bash
conda update -n base -c defaults conda
conda create -n conda_env python=3.8 -y -y
conda activate conda_env

rm -rf diffvg
rm -rf results
rm -rf tmp

conda install --file requirements.txt
pip install -r pip_requirements.txt

git clone https://github.com/BachiLi/diffvg.git
cp fix_problem.py diffvg/fix_problem.py
cd diffvg
git submodule update --init --recursive
python3 fix_problem.py
python setup.py install

cd ..
mkdir results
mkdir tmp

CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh
conda activate
uvicorn main:app --reload
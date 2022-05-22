#!/bin/bash
conda update -n base -c defaults conda
conda env create -f environment.yml
conda activate conda_env
pip install -r requirements.txt

cd src/
rm -rf diffvg
rm -rf results
rm -rf tmp
mkdir results
mkdir tmp

git clone https://github.com/BachiLi/diffvg.git
cp fix.py diffvg/fix.py
cd diffvg
git submodule update --init --recursive
# don't use python3
python fix.py
python setup.py install

cd ..
CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh
conda activate
python3 main.py
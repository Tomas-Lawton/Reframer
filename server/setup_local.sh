#!/bin/bash
conda update -n base -c defaults conda
conda create -n conda_env python=3.8.13 -y -y
conda activate conda_env
conda install --file conda-requirements.txt
pip install -r pip_requirements.txt

cd src
rm -rf src/diffvg
rm -rf src/results
rm -rf src/tmp
mkdir src/results
mkdir src/tmp

git clone https://github.com/BachiLi/diffvg.git
cd diffvg
git submodule update --init --recursive
cp ../fix.py fix.py
python3 fix.py
python setup.py install
echo "Setup Complete"
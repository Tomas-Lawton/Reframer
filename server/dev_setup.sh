#!/bin/bash
conda update -n base -c defaults conda
conda create -f environment.yml python=3.8.13 -y -y
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
python3 fix.py
python3 setup.py install
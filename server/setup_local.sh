#!/bin/bash
conda update -n base -c defaults conda
conda create --name conda_env
conda activate conda_env
pip install -r env_pip_config.txt
rm -rf src/diffvg
rm -rf src/results
rm -rf src/tmp
mkdir src/results
mkdir src/tmp

cd src
git clone https://github.com/BachiLi/diffvg.git
cd diffvg
git submodule update --init --recursive
cp ../fix.py fix.py
python3 fix.py
python3 setup.py install
cd ..
python3 main.py
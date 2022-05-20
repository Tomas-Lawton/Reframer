#!/bin/bash
conda update -n base -c defaults conda
conda create -n conda_env python=3.8.13 -y -y
conda activate conda_env
conda install --file conda_requirements.txt
pip install -r requirements.txt
pip install git+https://github.com/openai/CLIP.git
pip install 'pymongo[srv]'

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
python setup.py install
echo "Setup Complete"
cd ..
uvicorn main:app --reload  

#!/bin/bash
# conda update -n base -c defaults conda
# conda create -n conda_env python=3.8 -y -y
# conda create -n conda_env python=3.8.13 -y -y
# conda activate conda_env
# conda install --file setup/conda-requirements.txt
# pip install -r setup/pip_requirements.txt

cd src
rm -rf src/diffvg
rm -rf src/results
rm -rf src/tmp
mkdir src/results
mkdir src/tmp

git clone https://github.com/BachiLi/diffvg.git
cp fix_problem.py src/diffvg/fix_problem.py
cd diffvg
git submodule update --init --recursive
python3 fix_problem.py
python setup.py install

echo "Setup Completed"
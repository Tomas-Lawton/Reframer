#!/bin/bash
# conda update -n base -c defaults conda
# conda create -n conda_env python=3.8 -y -y
# conda create -n conda_env python=3.8.13 -y -y
# conda activate conda_env
# conda install --file setup/conda-requirements.txt
# pip install -r setup/pip_requirements.txt

cd app
rm -rf app/diffvg
rm -rf app/results
rm -rf app/tmp
mkdir app/results
mkdir app/tmp

git clone https://github.com/BachiLi/diffvg.git
cp fix_problem.py app/diffvg/fix_problem.py
cd diffvg
git submodule update --init --recursive
python3 fix_problem.py
python setup.py install

echo "Setup Completed"
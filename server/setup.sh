#!/bin/bash
# rm -rf src/diffvg
ls
rm -rf src/results
rm -rf src/tmp
mkdir src/results
mkdir src/tmp


# DO THIS MANUALLY
# git clone https://github.com/BachiLi/diffvg.git
# cp fix.py diffvg/fix.py
# cd diffvg
# git submodule update --init --recursive
# python3 fix.py
# python3 src/diffvg/setup.py install

# python3 src/diffvg/setup.py install
# pip install --use-feature=in-tree-build python3 src/diffvg/.
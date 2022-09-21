conda create -n aidraw
conda activate aidraw

cd src/
rm -rf diffvg
rm -rf results
rm -rf tmp
mkdir results
mkdir tmp

git clone https://github.com/BachiLi/diffvg.git
cp fix.py diffvg/fix.py
cd diffvg
python3 fix.py
git submodule update --init --recursive
conda install -y pytorch torchvision -c pytorch
conda install -y numpy
conda install -y scikit-image
conda install -y -c anaconda cmake
conda install -y -c conda-forge ffmpeg
pip install svgwrite
pip install svgpathtools
pip install cssutils
pip install numba
pip install torch-tools
pip install visdom
python3 setup.py install
cd ../..
pip install -r requirements.txt
# gcc version has to be 8 or lower to install diffvg
# gcc --version
# sudo apt install build-essential
# sudo apt -y install gcc-8
# sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 8
# sudo update-alternatives --config gcc

conda create -n cicada -y
conda activate cicada

git clone https://github.com/BachiLi/diffvg
cd diffvg
cp ../fix.py fix.py
python3 fix.py

git submodule update --init --recursive
conda install -y pytorch==1.12.1 torchvision==0.13.1 torchaudio==0.12.1 cudatoolkit=11.3 -c pytorch
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

cd ..
pip3 install -r requirements.txt
python3 setup.py install

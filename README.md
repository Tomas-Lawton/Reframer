# Reframer - Co-creative drawing with CLIP!

[Tomas Lawton](https://www.linkedin.com/in/tomas-lawton-512066199), [Francisco Ibarrola](https://www.linkedin.com/in/fibarrola/) and [Kazjon Grace](https://www.linkedin.com/in/kazjon-grace/)

Maximal control, minimal obtrusiveness has long been the hallmark of creativity support (Shneiderman, 2000). Reframer (shown by Figure 4.1) is functioning platform disrupting the status-quo by combining sketching with state-of-the-art AI algorithms for agent-augmented conceptual design. Unlike the vast majority of text-to-image generative systems, users are directly involved in the process of creation, and the AI is capable of making suggestions based on the user prompt. Users can create a sketch and a enter a prompt and Reframer will add strokes and modify the sketch. As this happens, users maintain seamless editorial control as they accept, modify, or reject AI contributions in real-time. In the final version, users can even describe parts of the sketch to the AI, thereby creating a goal hierarchy composed of multiple overlapping prompts. As the user draws, sketch developments are used as model inputs and the AI agent develops the sketch through optimisation based on differentiable rendering and CLIP (Frans et al., 2021; Radford et al., 2021). The model makes changes by gradually moving the lines on the canvas to look like an image described by the prompt, according to CLIP encoding (Radford et al., 2021)


![Image of the Reframer Interface](repo_img/reframer_interface.png?raw=true "Image of the Reframer Interface")


# Setup AI Model Code

In order to run Reframer application you will need to run both the client and the server. The server works on CPU although it is much better to use Reframer with a suitable graphics card (GPU). The following steps should automatically install the dependencies but you may need to tweak dependencies depending on your machine/GPU. 

```
cd server/
```

```
source dev_setup.sh
```

This runs the server code so it can listen for client updates.

```
cd src/
```

```
python3 main.py
```


# Troubleshooting 

If you experience issues with the setup or the listed device is not CUDA (and you have a graphics card), it is likely the torch/cuda are not configured correctly or there is a problem with diffvg dependency. 

You can try installing a certain torch version such as:

```
conda install pytorch==1.12.0 torchvision==0.13.0 torchaudio==0.12.0 cudatoolkit=11.3 -c pytorch
```

You may also want to reinstall some diffvg dependencies and rerun the diffvg setup
```
conda install setuptools cmake
```
```
cd diffvg
python3 setup.py install
```



# Run Drawing Client

Run the drawing client by opening index.html in chrome or using a live server extension. Firefox works but will not render the same as chrome. The client will automatically connect, and if all goes well the server light in the bottom left corner will turn green. You can restart the server at anytime and reconnect by clicking on this light.


<br>

# Step by Step Installation

For setup in the dwail computers

## Prerequisites

### gcc

Check version is 8 or lower
```
gcc --version
```

If not,
```
sudo apt install build-essential
sudo apt -y install gcc-8
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 8
sudo update-alternatives --config gcc
```

### curl
```
sudo apt install curl
```

### Anaconda
```
curl -O https://repo.anaconda.com/archive/Anaconda3-2023.03-Linux-x86_64.sh
bash https://repo.anaconda.com/archive/Anaconda3-2023.03-Linux-x86_64.sh
```

### Chrome
download Google Chrome from [https://www.google.com/chrome/](https://www.google.com/chrome/)
```
cd <download foder path>
sudo apt install ./google-chrome-stable_current_amd64.deb
```

### Clone this repo and go to this branch
```
git clone https://github.com/Tomas-Lawton/Reframer.git
git checkout fi_alt_setup
```

## Installation

starting fom Reframer folder
```
cd /server
source dev_setup.sh
```

## Usage

starting fom Reframer folder
```
cd /server/src
python3 main.py
```

in another terminal
```
cd /web
google-chrome index.html
```
# Reframer - Co-creative drawing!

[Tomas Lawton](https://www.linkedin.com/in/tomas-lawton-512066199), [Francisco Ibarrola](https://www.linkedin.com/in/fibarrola/) and [Kazjon Grace](https://www.linkedin.com/in/kazjon-grace/)

![Image of the Reframer Interface](repo_img/reframer_interface.png?raw=true "Image of the Reframer Interface")

Maximal control, minimal obtrusiveness has long been the hallmark of creativity support. Reframer [1] is functioning platform disrupting the status-quo by combining sketching with CICADA [2], a state-of-the-art AI algorithm for agent-augmented conceptual design. Unlike the vast majority of text-to-image generative systems, users are directly involved in the process of creation, and the AI is capable of making suggestions based on the user prompt. Users can create a sketch and a enter a prompt and Reframer will add strokes and modify the sketch. As this happens, users maintain seamless editorial control as they accept, modify, or reject AI contributions in real-time.

[1] [Drawing with Reframer: Emergence and Control in Co-Creative AI](https://dl.acm.org/doi/abs/10.1145/3581641.3584095)

[2] [A Collaborative, Interactive and Context-Aware Drawing Agent for Co-Creative Design]()

<br>
<br>

# Step by Step Installation

In order to run Reframer application you will need to run both the client and the server. The server works on CPU although it is much better to use Reframer with a suitable graphics card (GPU). The following steps should automatically install the dependencies but you may need to tweak dependencies depending on your machine/GPU. 

<br>

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

### Anaconda (example)
```
curl -O https://repo.anaconda.com/archive/Anaconda3-2023.03-Linux-x86_64.sh
bash Anaconda3-2023.03-Linux-x86_64.sh
```

### Clone this repo and go to this branch
```
git clone https://github.com/Tomas-Lawton/Reframer.git
cd Reframer/
```

<br>

## Installation

starting fom Reframer folder
```
cd server/
source dev_setup.sh
```

<br>

## Usage

starting fom Reframer folder
```
conda activate aidraw
cd /server/src
python3 main.py
```

in another terminal
```
cd /web
<YOUR BROWSER> index.html
```
eg: google-chrome index.html
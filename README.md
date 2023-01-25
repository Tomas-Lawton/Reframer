# Overview

In order to run Reframer application you will need to run both the client and the server. The server works on CPU although it is much better to use Reframer with a suitable graphics card (GPU). 

# Setup AI model code

This should automatically install dependencies but you may need to tweak dependencies depending on your machine/GPU. 


```
cd server/
```

```
source dev_setup.sh
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


# Run Fastapi AI 

This runs the server code so it can listen for client updates.

```
cd src/
```

```
python3 main.py
```

# Run Drawing Client

Run the drawing client by opening index.html in chrome or using a live server extension. Firefox works but will not render the same as chrome. The client will automatically connect, and if all goes well the server light in the bottom left corner will turn green. You can restart the server at anytime and reconnect by clicking on this light.
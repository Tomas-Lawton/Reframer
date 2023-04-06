FROM python:3.8

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y wget \
    && apt-get clean
    
RUN rm -rf /opt/conda && \
    wget --quiet https://repo.anaconda.com/archive/Anaconda3-2020.11-Linux-x86_64.sh -O ~/anaconda.sh && \
    /bin/bash ~/anaconda.sh -b -p /opt/conda && \
    rm ~/anaconda.sh && \
    ln -s /opt/conda/etc/profile.d/conda.sh /etc/profile.d/conda.sh && \
    echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc && \
    find /opt/conda/ -follow -type f -name '*.a' -delete && \
    find /opt/conda/ -follow -type f -name '*.js.map' -delete && \
    /opt/conda/bin/conda clean -afy
    
ENV PATH /opt/conda/bin:$PATH

COPY ./environment.yml /tmp/environment.yml
COPY ./requirements.txt /tmp/requirements.txt

RUN conda update conda \
    && conda env create -f /tmp/environment.yml python=3.8.13

ENV PATH /opt/conda/envs/env/bin:$PATH
ENV CONDA_DEFAULT_ENV env

SHELL ["conda", "run", "-n", "env", "/bin/bash", "-c"]

RUN pip install -r /tmp/requirements.txt
RUN echo "Trying Diffvg..."

RUN rm -rf diffvg && \
    rm -rf results  && \
    rm -rf tmp && \
    mkdir results && \
    mkdir tmp

RUN git clone https://github.com/BachiLi/diffvg.git && \
    cd diffvg  && \
    git submodule update --init --recursive 
COPY src/fix.py /app/diffvg/fix.py
RUN cd diffvg && \ 
    python fix.py && \ 
    python setup.py install

COPY src/ .
# EXPOSE 8000
RUN conda config --add channels conda-forge
RUN conda install pytorch==1.9.1 torchvision==0.10.1
RUN pip list
RUN conda list
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["python3", "main.py"]


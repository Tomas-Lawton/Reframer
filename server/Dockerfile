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

COPY ./env_config.yml /tmp/env_config.yml
COPY ./env_pip_config.txt /tmp/env_pip_config.txt

RUN conda update conda \
    && conda env create -f /tmp/env_config.yml
RUN echo "Envrionment Created. Trying Diffvg"

ENV PATH /opt/conda/envs/conda_env/bin:$PATH
ENV CONDA_DEFAULT_ENV conda_env

SHELL ["conda", "run", "-n", "conda_env", "/bin/bash", "-c"]

RUN pip install -r /tmp/env_pip_config.txt

RUN rm -rf diffvg

RUN git clone https://github.com/BachiLi/diffvg.git && \
    cd diffvg  && \
    git submodule update --init --recursive 
COPY src/fix.py /app/diffvg/fix.py
RUN cd diffvg && \ 
    python3 fix.py && \ 
    python3 setup.py install

COPY src/ .
EXPOSE 8080
CMD ["python3", "main.py"]


FROM continuumio/miniconda3

RUN mkdir /code
WORKDIR /code

COPY environment.yml /code/environment.yml
COPY requirements.txt /code/requirements.txt

RUN conda clean --all
RUN pip uninstall -y setuptools && \
    conda install setuptools && \
    conda update conda
RUN conda env create -f environment.yml python=3.8

COPY src /code/
RUN python3 diffvg/setup.py install
SHELL ["conda", "run", "-n", "conda_env", "/bin/bash", "-c"]

RUN pip install --no-cache-dir 'pymongo[srv]'
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir git+https://github.com/openai/CLIP.git
RUN pip install setuptools

ENTRYPOINT ["conda", "run", "--no-capture-output", "-n", "conda_env", "python", "main.py"]
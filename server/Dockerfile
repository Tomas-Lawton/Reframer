FROM continuumio/miniconda3
RUN apt-get update && apt-get install -y python3-pip

RUN mkdir /code
WORKDIR /code

COPY environment.yml /code/environment.yml
COPY requirements.txt /code/requirements.txt

RUN conda clean --all
RUN conda update conda
RUN conda env create -f environment.yml python=3.8
RUN conda list

# SHELL ["conda", "run", "-n", "conda_env", "/bin/bash", "-c"]

RUN pip install 'pymongo[srv]'
RUN pip install -r requirements.txt
RUN pip install git+https://github.com/openai/CLIP.git
RUN pip list
COPY src /code/

RUN rm -rf diffvg
RUN git clone https://github.com/BachiLi/diffvg.git
RUN cp fix.py diffvg/fix.py
RUN cd diffvg
# RUN python diffvg/fix.py install
RUN python diffvg/setup.py install

# EXPOSE 8000
# RUN /bin/bash -c "source activate conda_env"
CMD [ "python", "main.py" ]

# RUN echo "source activate myenv" > ~/.bashrc
# ENV PATH /opt/conda/envs/env/bin:$PATH
# COPY ./entrypoint.sh code
# ENTRYPOINT ["/entrypoint.sh"]
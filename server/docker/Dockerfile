# FROM ubuntu:16.04
# SHELL [ "/bin/bash", "--login", "-c" ]

# # Create a non-root user
# ARG username=al-khawarizmi
# ARG uid=1000
# ARG gid=100
# ENV USER $username
# ENV UID $uid
# ENV GID $gid
# ENV HOME /home/$USER
# RUN adduser --disabled-password \
#     --gecos "Non-root user" \
#     --uid $UID \
#     --gid $GID \
#     --home $HOME \
#     $USER

# COPY environment.yml /tmp/
# COPY requirements.txt  /tmp/
# RUN chown $UID:$GID /tmp/requirements.txt
# RUN chown $UID:$GID /tmp/environment.yml

# COPY entrypoint.sh /usr/local/bin/
# RUN chown $UID:$GID /usr/local/bin/entrypoint.sh && \
#     chmod u+x /usr/local/bin/entrypoint.sh
# # COPY setup.sh /tmp/

# USER $USER
# # install miniconda
# ENV MINICONDA_VERSION 4.8.2
# ENV CONDA_DIR $HOME/miniconda3
# RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh -O ~/miniconda.sh && \
#     chmod +x ~/miniconda.sh && \
#     ~/miniconda.sh -b -p $CONDA_DIR && \
#     rm ~/miniconda.sh
# # make non-activate conda commands available
# ENV PATH=$CONDA_DIR/bin:$PATH
# # make conda activate command available from /bin/bash --login shells
# RUN echo ". $CONDA_DIR/etc/profile.d/conda.sh" >> ~/.profile
# # make conda activate command available from /bin/bash --interative shells
# RUN conda init bash

# # create a project directory inside user home
# ENV PROJECT_DIR $HOME/src
# RUN mkdir $PROJECT_DIR
# WORKDIR $PROJECT_DIR

# # build the conda environment
# ENV ENV_PREFIX $PWD/env
# RUN conda update --name base --channel defaults conda && \
#     conda env create --prefix $ENV_PREFIX --file /tmp/environment.yml --force && \
#     conda clean --all --yes
# # run the postBuild script to install any JupyterLab extensions
# RUN conda activate $ENV_PREFIX && \
#     /usr/local/bin/postBuild.sh && \
#     conda deactivate

# ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
# CMD ["uvicorn", "main:app", "--host=0.0.0.0"]


FROM continuumio/miniconda3

WORKDIR /code

# Create the environment:
COPY environment.yml .
RUN conda env create -f environment.yml

# Make RUN commands use the new environment:
SHELL ["conda", "run", "-n", "conda_env", "/bin/bash", "-c"]
RUN conda install python=3.8 && \ 
    conda install --file conda_requirements.txt && \
    pip install git+https://github.com/openai/CLIP.git && \
    pip install --no-cache-dir --upgrade -r requirements.txt && \
    pip install 'pymongo[srv]' && \
    echo "Done with requirements. Trying diffvg" 

# COPY ~/src /code/
RUN python3 src/diffvg/setup.py install

# The code to run when container is started:
CMD ["uvicorn", "src.main:app", "--host=0.0.0.0"]



# RUN conda update -n base -c defaults conda \
#  conda create -n conda_env python=3.8.13 -y -y \ 
#  conda activate conda_env \
# COPY conda_requirements.txt /code/conda_requirements.txt
# RUN conda install python=3.8
# RUN conda install --file conda_requirements.txt

# COPY requirements.txt /code/requirements.txt
# RUN pip install git+https://github.com/openai/CLIP.git
# RUN pip install --no-cache-dir --upgrade -r requirements.txt
# RUN pip install 'pymongo[srv]'

# COPY /src /code/src

# COPY setup.sh /code/
# COPY show.sh /code/

# # RUN ./show.sh
# # RUN conda list
# # RUN pip list
# RUN ./setup.sh

# RUN python3 src/diffvg/setup.py install


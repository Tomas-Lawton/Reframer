FROM continuumio/miniconda3

WORKDIR /code

# Create the environment:
COPY environment.yml .
RUN conda update -n base -c defaults conda
RUN conda env create -f environment.yml

# Make RUN commands use the new environment:
SHELL ["conda", "run", "-n", "conda_env", "/bin/bash", "-c"]
RUN conda install python=3.8 && \ 
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


FROM python:3.8
FROM continuumio/miniconda3

WORKDIR /code

COPY requirements.txt /code/requirements.txt
RUN pip install git+https://github.com/openai/CLIP.git
RUN pip install --no-cache-dir --upgrade -r requirements.txt
RUN pip install 'pymongo[srv]'

COPY conda_requirements.txt /code/conda_requirements.txt
RUN conda install --file conda_requirements.txt

COPY setup.sh /code/setup.sh
RUN ./setup.sh

# COPY ./src /code/src
COPY /src .
 
CMD ["uvicorn", "main:app", "--host=0.0.0.0"]
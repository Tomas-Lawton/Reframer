FROM python:3.8
FROM continuumio/miniconda3

WORKDIR /code

COPY requirements.txt /code/requirements.txt
RUN pip install git+https://github.com/openai/CLIP.git
RUN pip install --no-cache-dir --upgrade -r requirements.txt
RUN pip install 'pymongo[srv]'

COPY conda_requirements.txt /code/conda_requirements.txt
RUN conda install --file conda_requirements.txt
# RUN src/setup.sh

# RUN src/setup.sh

# RUN python3 src/diffvg/setup.py install

COPY /src /code/src

CMD ["uvicorn", "main:app", "--host=0.0.0.0"]

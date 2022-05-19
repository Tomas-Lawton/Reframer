FROM python:3.8
FROM continuumio/miniconda3

COPY ./src /src
COPY ./pip-requirements.txt .
COPY ./conda-requirements.txt .
WORKDIR /src

RUN pip install -r pip-requirements.txt
RUN conda install --file conda-requirements.txt

COPY setup.sh .
RUN chmod +x /setup.sh
RUN /setup.sh

EXPOSE 8000
# COPY ./server /code/server
 
CMD ["uvicorn", "src.main:app", "--host=0.0.0.0"]
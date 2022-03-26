
# install packages using both conda and pip, but just run conda environment
conda create --name conda_env
conda activate
conda install --file requirements.txt

python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
deactivate

# start application server
uvicorn main:app --reload

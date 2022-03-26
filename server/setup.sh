# install packages using both conda and pip, but just run conda environment
conda activate
conda install --file requirements.txt

source env/bin/activate
pip install -r requirements.txt
deactivate
# start application server
uvicorn main:app --reload

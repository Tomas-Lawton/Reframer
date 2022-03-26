# install packages using both conda and pip, but just run conda environment
source env/bin/activate
pip install -r requirements.txt
deactivate
conda activate
conda install --file requirements.txt
# start application server
uvicorn main:app --reload

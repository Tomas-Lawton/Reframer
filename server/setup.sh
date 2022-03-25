# install packages using both conda and pip, but just run pip environment
source env/bin/activate
conda start
pip install -r requirements.txt
conda install --file requirements.txt
# start application server
uvicorn main:app --reload

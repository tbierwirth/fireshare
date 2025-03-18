#Setup Virtual Environment
python3 -m venv venv
. venv/bin/activate
. $(pwd)/.env.dev

python3 -m pip install -r app/server/requirements.txt
cd app/server && python3 setup.py install && cd ../..

python3 -m flask db upgrade
python3 -m flask run --with-threads
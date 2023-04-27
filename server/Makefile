install:
	python3 setup.py install

pretty:
	black --config black.toml .

lint:
	black --config black.toml --check .
	flake8 --config setup.cfg .

test:
	python3 -m pytest

inspection_test:
	python3 trials/trace_fixing_test.py
	python3 trials/prompt_change_test.py
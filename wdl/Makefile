.PHONY: test

wdl.zip: *.wdl
	zip wdl.zip  *.wdl

test:   import-test.wdl test.json options.json wdl.zip
	cromshell submit import-test.wdl test.json options.json wdl.zip

preprocess_test: preprocess-test.wdl preprocess-test.json options.json wdl.zip
	cromshell submit preprocess-test.wdl preprocess-test.json options.json wdl.zip

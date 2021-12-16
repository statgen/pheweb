.PHONY: test

wdl.zip: *.wdl
	zip wdl.zip  *.wdl

test:   import-test.wdl test.json options.json wdl.zip
	cromshell submit import-test.wdl test.json options.json wdl.zip

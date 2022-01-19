.PHONY: test-trival-nosites default
default: test-trivial-nosites

wdl.zip: *.wdl
	zip wdl.zip  *.wdl

test-trivial-nosites: wdl.zip
	cromshell submit test-trivial-nosites.wdl test-trivial-nosites.json options.json wdl.zip

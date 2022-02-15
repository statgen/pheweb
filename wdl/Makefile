.PHONY: test-trival-nosites default
default: test-trivial-sites

wdl.zip: *.wdl
	zip wdl.zip  *.wdl

test-trivial-nosites: wdl.zip
	cromshell submit test-trivial.wdl test-trivial-nosites.json options.json wdl.zip

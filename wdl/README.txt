'r8.json' provides an example configuration.

the wdl to use is 'import.wdl'.

Required parameters :

pheweb.docker : docker image
pheweb.summary_files : file containing the list of summary files
pheweb.bed_file : the bed file
pheweb.disk : disk space needed for the whole export
pheweb.matrix.cpu : cpu's need for the matrix step
pheweb.mem : memory size
pheweb.sites : sites file
pheweb.custom_json :
NOTE : there must be an entry in the file for every pheno code in the summary file

Example :
```
[ { "phenocode" : "A" , "phenostring" : "Ankle" } , { "phenocode" : "B" , "phenostring" : "Back" } ]
```

pheweb.fields : fields to import from the custom json file

Example :

```
["category" ,
 "category_index" ,
 "num_cases" ,
 "num_cases_prev" ,
 "num_controls" ,
 "num_gw_significant" ,
 "num_gw_significant_prev" ,
 "phenocode",
 "phenostring" ]
```

import_pheweb.output_url : array of root directories to output files to

the following storage options are supported

webdav : http://
google cloud : gs://
nfs : nfs://


For nfs directories have to be created prior to runing the import

mkdir -p generated-by-pheweb/{sites,resources,pheno_gz,manhattan,qq}


Development and testing

To run the pipeline on a trivial dataset to test the pipeline

```
	make wdl.zip && cromshell submit test-trivial.wdl test-trivial-nosites.json options.json wdl.zip
```

To test run the r8 import the following was run

```
	make wdl.zip && cromshell submit import.wdl r8.1.json options.json wdl.zip
```

options.json  r8.100.json  r8.1.json  r8.json    XXX-r8.10.json  XXX-test-single-file.json  XXX-test-trivial-sites.json

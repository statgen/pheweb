# Import

## Overview
'r8.json' provides an example configuration.

the wdl to use is 'import.wdl'.

## Versioning

There is a variable that is prefixed by version_ that needs to
be set appropriately to ensure the version import.wdl and json
match.  For example `version_r9_1` is a boolean variable that
has to be set in the configuration json to run the wdl.  Check 
the history of import.wdl to find the appropriate version.

## Parameters
### Required parameters

**pheweb.docker** : docker image

**pheweb.summary_files** : file containing the list of summary files

**pheweb.bed_file** : the bed file
      
**pheweb.disk** : disk space needed for the whole export

**pheweb.matrix.cpu** : cpu's need for the matrix step

**pheweb.mem** : memory size

**pheweb.sites** : sites file

**pheweb.custom_json** : fields to be added to the pheno-list.json

NOTE : there must be an entry in the file for every pheno code in the summary file

Example :
```
[ { "phenocode" : "A" , "phenostring" : "Ankle" } , { "phenocode" : "B" , "phenostring" : "Back" } ]
```

**pheweb.fields** : fields to import from the custom json file

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

### Optional parameters

**preprocess.alt_column** : column to use for alt

**preprocess.pval_column** : column to use for p-value

**preprocess.mlogp_column** : column to use for mlog p-value

**preprocess.beta_column** : column to use for beta

**preprocess.se_beta_column** : column to use to se-beta

**preprocess.rename** : column separated list of fields to rename : old1:new1,...

**preprocess.exclude** : comma separated list of fields to : field1,field2

**import_pheweb.output_url** : array of url to output files to

the following storage options are supported

|storage      | url prefix |
|-------------|------------|
|webdav       | http://    |
|google cloud | gs://      |
|nfs          | nfs://     |



**NOTE** For nfs directories have to be created prior to runing the import

```
mkdir -p {cache,generated-by-pheweb/{sites,resources,pheno_gz,manhattan,qq}}
```

**import_pheweb.post_import**

Optional commands to run after import e.g.


```
  "import_pheweb.post_import" : [ "gcloud container clusters get-credentials staging-pheweb --zone europe-west1-b && kubectl delete pods --all --wait=false" ]
```

## Development and testing

To run the pipeline on a trivial dataset to test the pipeline

```
	make wdl.zip && cromshell submit test-trivial.wdl test-trivial-nosites.json options.json wdl.zip
```

To test run the r8 import the following was run

```
	make wdl.zip && cromshell submit import.wdl r8.1.json options.json wdl.zip
```

options.json  r8.100.json  r8.1.json  r8.json    XXX-r8.10.json  XXX-test-single-file.json  XXX-test-trivial-sites.json

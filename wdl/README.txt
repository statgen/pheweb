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
example :
[ { "phenocode" : "A" , "phenostring" : "Ankle" } , { "phenocode" : "B" , "phenostring" : "Back" } ]

pheweb.fields : fields to import from the custom json file
example :
["category" , "category_index" , "num_cases" , "num_cases_prev" , "num_controls" , "num_gw_significant" , "num_gw_significant_prev" , "phenocode", "phenostring" ]

data_dir="/Users/mitja/projects/finngen/pheweb/remotedata/pheweb/pheweb/"

database_conf = ({ "annotation":
                    {"ElasticAnnotationDao": { "host":"35.187.119.225","port":9200, "variant_index":"finngen_r1_variant_annotation"}  }
                 },
                 { "result": { "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 { "gnomad":
                     { "ElasticGnomadDao": { "host":"35.189.223.57","port":9200, "variant_index":"gnomad_combined"} }
                 },
                 {"externalresult": { "ExternalFileResultDao": {"manifest":"/Users/mitja/projects/finngen/ukbb_matching/data/ukkb_data.tsv"}}}
                )

report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

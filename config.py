data_dir="/mnt/data-disk/pheweb/"

database_conf = ({ "annotation":
                    {"ElasticAnnotationDao": { "host":"35.187.119.225","port":9200, "variant_index":"finngen_r1_variant_annotation"}  }
                 },
                 { "result": { "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 { "gnomad":
                     { "ElasticGnomadDao": { "host":"35.189.223.57","port":9200, "variant_index":"gnomad_combined"} }
                 },
                 {"externalresult": { "ExternalMatrixResultDao": {"matrix":"/mnt/data-disk-ssd/ukbb/pheno/smalltestmatrix.tsv.gz", "metadatafile":"/home/mitja/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}}}
                )

#{"externalresult": { "ExternalFileResultDao": {"manifest":"/home/mitja/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}}}
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}


authentication=False
authentication_file = "/mnt/r2/google.prod.conf"

data_dir="/mnt/r3_1"

database_conf = ({ "annotation":
                    #{"ElasticAnnotationDao": { "host":"35.187.119.225","port":9200, "variant_index":"finngen_r1_variant_annotation"}  }
                    {"TabixAnnotationDao": { "const_arguments": [("matrix_path","ANNOTATION_MATRIX_PATH")] } }
                 },
                 { "result": { "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 { "gnomad":
                     #{ "ElasticGnomadDao": { "host":"35.189.223.57","port":9200, "variant_index":"gnomad_combined"} }
                     {"TabixGnomadDao": { "const_arguments": [("matrix_path","GNOMAD_MATRIX_PATH")] }}
                 },
                 { "lof":
                   { "ElasticLofDao": { "host":"35.240.29.13","port":9200, "gene_index":"finngen_r1_hc_lof" }}
                 },
                 {"externalresultmatrix": { "ExternalMatrixResultDao": {"matrix":"/mnt/r2/ukbb/matrix.tsv.gz", "metadatafile":"/mnt/r2/ukbb/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}}},
                 {"externalresult": { "ExternalFileResultDao": {"manifest":"/mnt/r2/ukbb/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}}},
                 {"tsv": 
                    {"TSVDao": {"coding":"/mnt/r3/tsv/coding_web.txt"} }
                 }
                )

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

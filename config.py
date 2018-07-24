
data_dir="/mnt/data-disk-ssd/pheweb"

database_conf = ({ "annotation":
                    #{"ElasticAnnotationDao": { "host":"35.187.119.225","port":9200, "variant_index":"finngen_r1_variant_annotation"}  }
                    {"TabixAnnotationDao": { "const_arguments": [("matrix_path","ANNOTATION_MATRIX_PATH")] } }
                 },
                 { "result": { "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 { "gnomad":
                     #{ "ElasticGnomadDao": { "host":"35.189.223.57","port":9200, "variant_index":"gnomad_combined"} }
                     {"TabixGnomadDao": { "const_arguments": [("matrix_path","GNOMAD_MATRIX_PATH")] }}
                 },
                {"externalresultmatrix": { "ExternalMatrixResultDao": {"matrix":"/mnt/data-disk-ssd/ukbb/matrix.tsv.gz", "metadatafile":"/mnt/data-disk-ssd/ukbb/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}}},
                {"externalresult": { "ExternalFileResultDao": {"manifest":"/mnt/data-disk-ssd/ukbb/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}}} 
                )


report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

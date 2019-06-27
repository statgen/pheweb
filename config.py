authentication=False
authentication_file = "/mnt/r3_1/google.prod.conf"

data_dir="/mnt/r3_1"

database_conf = (
    {
        "annotation": {
            "TabixAnnotationDao": { "const_arguments": [("matrix_path","ANNOTATION_MATRIX_PATH")] } }
    }, {
        "result": {
            "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] }
        }
    }, {
        "gnomad": {
            "TabixGnomadDao": { "const_arguments": [("matrix_path","GNOMAD_MATRIX_PATH")] }
        }
    }, {
        "lof": {
            "ElasticLofDao": { "host":"35.240.29.13","port":9200, "gene_index":"finngen_r2_lof" }
        }
    }, {
        "externalresultmatrix": {
            "ExternalMatrixResultDao": {"matrix":"/mnt/r3_1/ukbb/matrix.tsv.gz", "metadatafile":"/mnt/r3_1/ukbb/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}
        }
    }, {
        "externalresult": {
            "ExternalFileResultDao": {"manifest":"/mnt/r3_1/ukbb/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}
        }
    }, {
        "tsv": {
            "TSVDao": {"coding":"/mnt/r3_1/tsv/coding_web.txt"}
        }
    }
)

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

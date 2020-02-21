authentication=True
authentication_file = "/mnt/nfs/pheweb/google.dev2.conf"

data_dir="/mnt/nfs/pheweb/r5_cancer/"
cache="/mnt/nfs/pheweb/r5_cancer/cache/"

browser="FINNGEN"
release="R5"
release_prev="R4"
title="FREEZE 5 CANCER"

ld_server = 'http://api.finngen.fi'

database_conf = (
    {
        "annotation": {
            "TabixAnnotationDao": { "matrix_path": "/mnt/nfs/annotations/r5/R5_annotated_variants_v1.gz" }
        }
    }, {
        "result": {
            "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] }
        }
    }, {
        "gnomad": {
            "TabixGnomadDao": { "matrix_path": "/mnt/nfs/annotations/gnomad21/gnomad.genomes.r2.1.sites.liftover.b38.finngen.r2pos.af.ac.an.tsv.gz" }
        }
    }, {
        "lof": {
            "LofMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r5_demo/mysql.conf" }
        }
    }, {
        "externalresultmatrix": {
            "ExternalMatrixResultDao": {"matrix":"/mnt/nfs/ukbb_neale/matrix.tsv.gz", "metadatafile":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}
        }
    }, {
        "externalresult": {
            "ExternalFileResultDao": {"manifest":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}
        }
    }, {
        "tsv": {
            "CodingDao": {"coding":"/mnt/nfs/coding/r4/coding_web.txt"}
        }
    }, {
        "finemapping" : {
            "FineMappingMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r5_demo/mysql.conf", "base_paths": {"conditional": "/mnt/nfs/finemapping/r5_demo/conditional", "susie": "/mnt/nfs/finemapping/r5_demo/susie/snp", "finemap": "/mnt/nfs/finemapping/r5_demo/finemap/cred"} }
        }
    }
)

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

locuszoom_conf = {"p_threshold": 0.05, "prob_threshold": 0.0001, "ld_service": "finngen", "ld_max_window": 5000000}

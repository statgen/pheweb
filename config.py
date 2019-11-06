authentication=True
authentication_file = "/mnt/pheweb/google.dev.conf"

data_dir="/mnt/nfs/pheweb/r4/"
cache="/mnt/nfs/pheweb/r4/cache/"

browser="FINNGEN"
title="FREEZE 4"

database_conf = (
    {
        "annotation": {
            "TabixAnnotationDao": { "matrix_path": "/mnt/nfs/annotations/r4/annotated_variants.gz" }
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
            "LofMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r4/mysql.conf" }
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
            "FineMappingMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r4/mysql.conf", "base_paths": {"conditional": "/mnt/nfs/finemapping/r4/conditional", "susie": "/mnt/nfs/finemapping/r4/susie/snp", "finemap": "/mnt/nfs/finemapping/r4/finemap/cred"} }
        }
    }
)

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

locuszoom_conf = {"p_threshold": 0.05, "prob_threshold": 0.0001}

authentication=True
authentication_file = "/mnt/nfs/pheweb/google.dev2.conf"

data_dir="/mnt/nfs/pheweb/r4_drugs_aoo/"
cache="/mnt/nfs/pheweb/r4_drugs_aoo/cache/"

browser="FINNGEN_QUANT"
release="R5"
release_prev="R4"
title="FREEZE 4 DRUGS + AGE"

ld_server = 'http://api.finngen.fi'

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
    }
)

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

locuszoom_conf = {"p_threshold": 0.05, "prob_threshold": 0.0001, "ld_service": "finngen", "ld_max_window": 5000000}

authentication=True
authentication_file = "/mnt/nfs/pheweb/google.dev.conf"

data_dir="/mnt/nfs/pheweb/r4/"
cache="/mnt/nfs/pheweb/r4/cache/"

browser="FINNGEN"
release="R4"
release_prev="R3"
title="FREEZE 4"
page_title="FinnGen results"
noindex=True

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
        "coding": {
            "TSVCodingDao": {"data":"/mnt/nfs/coding/r4/coding_web.txt"}
        }
    }, {
        "finemapping" : {
            "FineMappingMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r4/mysql.conf", "base_paths": {"conditional": "/mnt/nfs/finemapping/r4/conditional", "susie": "/mnt/nfs/finemapping/r4/susie/snp", "finemap": "/mnt/nfs/finemapping/r4/finemap/cred"} }
        }
    }
)

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}

locuszoom_conf = {"p_threshold": 0.05, "prob_threshold": 0.0001, "ld_service": "finngen", "ld_max_window": 5000000}
vis_conf = {"loglog_threshold": 10, "info_tooltip_threshold": 0.8, "manhattan_colors": ['rgb(53,0,212)', 'rgb(40, 40, 40)']}

about_content='<h1>About this site</h1><br><p>The genetic association results on this website are from the FinnGen study. These results are from 2,925 endpoints of data freeze 5 (spring 2020), consisting of 218,792 individuals.</p><p>This site was built with PheWeb (<a href="https://github.com/statgen/pheweb/">original repository</a>, <a href="https://github.com/FINNGEN/pheweb/">Finngen repository</a>). All positions are on GRCh38.</p><p>PheWAS contact: Samuli Ripatti (samuli.ripatti@helsinki.fi)<br/>FinnGen contact: Aarno Palotie (aarno.palotie@helsinki.fi)</p>'

coding_content='<p>This table contains p &lt; 1e-4 associations for each coding variant in FinnGen data freeze 4 (2,264 endpoints). The following gnomAD annotation categories are included: predicted loss-of-function (pLoF), low-confidence loss-of-function (LC), inframe indel, missense, start lost, stop lost. Variants have been filtered to imputation INFO score &gt; 0.6.</p><p style={{paddingBottom: \'10px\'}}>Finnish enrichment (FIN enr) is calculated as FIN AF / NFSEE AF in gnomAD 2.1, where NFSEE is non-Finnish-non-Swedish-non-Estonian European. p-values &lt; 5e-8 and Finnish enrichment &gt; 5 are in green. As the consequence and category columns are based on different genome builds (38 and 37 respectively), they differ for some variants. Hover over the column names to see their explanations, click on the column names to sort by them, and type values in the boxes below the column names to filter. Click on a variant, phenotype, or gene to get to its page.</p>'

lof_content='<p>This table contains p &lt; 1e-3 associations from loss-of-function gene burden tests in FinnGen data freeze 4 (2,264 endpoints). The following VEP-annotated variants are considered: frameshift, splice donor, stop gained, splice acceptor. Association tests were run with SAIGE using the same covariates as in the regular GWAS. The dosage for each gene was calculated as the probability of carrying a minor allele in a LoF variant in the gene (1 - sum(prob(major)) where prob(major) is the genotype probability of the major allele for each variant).</p>'

logo='<img src="/static/images/finngen_loop1.gif" style="float: left; width: 60px; height: 60px; margin: -10px; margin-top: 8px" />'

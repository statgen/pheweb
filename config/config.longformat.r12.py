authentication=True
cors_origins="*"
authentication_file = "/etc/gcp/oauth.conf"
noindex=True

data_dir="/mnt/nfs/pheweb/r12/release/"
resource_dir="/mnt/nfs/pheweb/r12/release/resources"
cache="/mnt/nfs/pheweb/r12/release/cache/"
collector_cidrs = ["0.0.0.0/0"]

database_conf = (
     { "gnomad": { "TabixGnomadDao": { "matrix_path": "/mnt/nfs/pheweb/r12/release/annotation/gnomad21/gnomad.genomes.r2.1.sites.liftover.b38.finngen.r2pos.af.ac.an.tsv.gz" } } },

    { "annotation": { "TabixAnnotationDao": { "matrix_path": "/mnt/nfs/pheweb/r12/release/annotation/variants/R12_annotated_variants_v1.gz" ,
                                              "gene_column" : "gene_most_severe" } } },
    
    { "result": { 
        "TabixResultFiltDao": { 'const_arguments': [ ("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH") ], 
        "columns" : {"pheno": "#pheno", "mlogp": "mlogp", "beta": "beta", "sebeta": "sebeta", "maf": "af_alt", "maf_cases": "af_alt_cases", "maf_controls": "af_alt_controls"}  } 
    } },
    { "autocompleter" : { "AutocompleterSqliteDAO" : { "const_arguments" : [ ("phenos" , "PHEWEB_USE_PHENOS") ],
                                                       "cpras_rsids_path" : "/mnt/nfs/pheweb/r12/release/generated-by-pheweb/sites/cpras-rsids.sqlite3",
                                                       "gene_aliases_path" : "/mnt/nfs/pheweb/r12/release/generated-by-pheweb/resources/gene_aliases.sqlite3" } } },
    { "finemapping" : { "FineMappingMySQLDao": { "authentication_file": "/etc/gcp/mysql.conf",
                                                 "base_paths": { "susie": "/mnt/nfs/pheweb/r12/release/finemap/snp",
                                                                 "conditional": "/mnt/nfs/pheweb/r12/release/finemap/conditional",
                                                                 "finemap": "/mnt/nfs/pheweb/r12/release/finemap/cred" } } } } ,
    { "lof": { "LofMySQLDao": { "authentication_file": "/etc/gcp/mysql.conf" } } },
    { "autoreporting": {"AutoreportingDao": { "authentication_file": "/etc/gcp/mysql.conf",
                                              "group_report_path": "/mnt/nfs/pheweb/r12/release/autoreport/group_reports"} } } ,
    { "colocalization": { "ColocalizationDAO": { "db_url": "/etc/gcp/mysql.conf" ,
                                             "echo" : False  } } },
    { "variant_phenotype" :
      { "VariantPhenotypeDao" :
        { "authentication_file": "/etc/gcp/mysql.conf" ,
          "fields" : [ { "table" : "variant_phenotype_pip" ,
                         "columns" : [ "pip" ] },
                      ]
         }
       }
     },
    { "coding":
      {"FileCodingDAO":
       { "phenos" : "/mnt/nfs/pheweb/r12/release/chip/analyzed_phenos.json" ,
         "variant_annotation" : "/mnt/nfs/pheweb/r12/release/chip/r12_imp_chip_anno.tsv.gz" ,
         "gwas_tiledb" : "/mnt/nfs/pheweb/r12/release/chip/r12_coding_tiledb" ,
         "top_table" : "/mnt/nfs/pheweb/r12/release/chip/R12_coding_variant_results_1e-5_signals.tsv" ,
         "plot_root" : "gs://finngen-production-library-green/finngen_R12/cluster_plots/raw/" ,
         "path_format": "{plot_root}{variant}.png",
       }
      }
    },

    { 
        # pqtl / colocalization table, optional
        "pqtl_colocalization": { 
            "PqtlColocalisationDao": { 
                "authentication_file": "/etc/gcp/mysql.conf",
                "pqtl": {
                    "table": "pqtl_finemap",
                    "columns": [ "trait","region","cs","v","cs_specific_prob", "cs_log10bf", "cs_min_r2", "beta", "p", "prob",  "most_severe", "gene_name", "gene_most_severe", "source", "source_displayname"] 
                },
                "colocalization": {
                    "table": "colocalization",
                    "columns": ["source2", "phenotype1", "phenotype1_description",
                              "phenotype2", "phenotype2_description",
                              "clpp", "clpa", "len_inter", "len_cs1",
                              "len_cs2", "source2_displayname", "beta1", "beta2", "pval1", "pval2",
                              "locus_id2_chromosome", "locus_id2_position", "locus_id2_ref", "locus_id2_alt",
                              "locus_id1_chromosome", "locus_id1_position", "locus_id1_ref", "locus_id1_alt"]
                }
            } 
        } 
     },
    )

n_query_threads=4
report_conf = {"func_var_assoc_threshold":0.0001,
               "gene_top_assoc_threshold":0.0001}

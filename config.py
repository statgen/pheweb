data_dir="/mnt/data-disk-ssd/pheweb"

database_conf = ({ "annotation":
                    {"tabix": { "const_arguments": [("matrix_path","ANNOTATION_MATRIX_PATH")] } }},
                 { "result": { "tabix": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 { "gnomad":
                    {"tabix": { "const_arguments": [("matrix_path","GNOMAD_MATRIX_PATH")] } }
                 }
                )

report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}


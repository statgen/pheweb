import "import.wdl" as pheweb_import

task create_custom_json {


  command <<<
    echo -e '{ "mystery_phenotype" : {} }'  > custom.json
  >>>

  runtime { docker: "python:3.8" }
  output { File custom_json = 'custom.json' }

}

task create_trivial_sequence {

  command {
    echo -e "#chrom\tpos\tref\talt\tpval\tmlogp\tbeta\tsebeta\n1\t1\tA\tG\t0.1\t0.2\t0.3\t0.4" > mystery_phenotype
  }

  runtime { docker: "python:3.8" }
  output { File summary_file = 'mystery_phenotype' }
}

task trivial_summary {
  String path

  command {  echo ${path} > summary_files.tsv }

  runtime { docker: "python:3.8" }
  output { File summary_files = 'summary_files.tsv' }
}

workflow test_trivial_no_sites {
  String docker
  call create_custom_json
  call create_trivial_sequence
  call trivial_summary { input : path = create_trivial_sequence.summary_file }
  call pheweb_import.import_pheweb { input :
       docker = docker ,
       disk = 1000 ,
       mem = 16 ,
       custom_json = create_custom_json.custom_json ,
       fields = [] ,
       summary_files = trivial_summary.summary_files
  }
}

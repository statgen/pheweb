import "import.wdl" as pheweb_import

task trivial_sequence {

  command {
    echo -e "#chrom\tpos\tref\talt\tpval\tmlogp\tbeta\tsebeta\n1\t1\tA\tG\t0.1\t0.2\t0.3\t0.4" > mystery_phenotype
  }

  runtime {
    docker: "python:3.6"
  }
  output {
    File summary_file = 'mystery_phenotype'
  }
}

task trivial_summary {
  String path

  command {
    echo ${path} > summary_files.tsv
  }

  runtime {
    docker: "python:3.6"
  }

  output {
    File summary_files = 'summary_files.tsv'
  }
}

workflow test_trivial_no_sites {
  String docker
  call trivial_sequence
  call trivial_summary { input : path = trivial_sequence.summary_file }
  call pheweb_import.import_pheweb { input :
       docker = docker ,
       disk = 1000 ,
       mem = 16 ,
       summary_files = trivial_summary.summary_files
  }
}

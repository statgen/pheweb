import "import.wdl" as pheweb_import

task HelloWorldTask {

  command {
    echo -e "#chrom\tpos\tref\talt\tpval\tmlogp\tbeta\tsebeta\n1\t1\tA\tC\t0.1\t0.2\t0.3\t0.4\n" > tmp.tsx
  }

  runtime {
    docker: "python:3.6"
  }
}

workflow HelloWorld {
  call HelloWorldTask
}

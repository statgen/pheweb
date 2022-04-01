task best_phenos_by {
  String docker
  File matrix_file
  File pheno_json
  Int disk
  Int mem
  Int cpu
  File bed_file

  String dir = '/cromwell_root/'

  command <<<
    set -euxo pipefail
    mkdir -p pheweb/generated-by-pheweb/tmp && \
    mkdir -p /root/.pheweb/cache && mv ${bed_file} /root/.pheweb/cache/genes-b38-v37.bed && \
    mv ${pheno_json} pheweb/pheno-list.json && \
    mv ${matrix_file} pheweb/generated-by-pheweb/matrix.tsv.gz && \
    cd pheweb && \
    pheweb gather-pvalues-for-each-gene
  >>>

  output {
    File pheno_gene = "pheweb/generated-by-pheweb/best-phenos-by-gene.json"
  }

  runtime {
    docker: "${docker}"
    cpu: "${cpu}"
    memory: "${mem} GB"
    disks: "local-disk ${disk} HDD"
    zones: "europe-west1-b"
    preemptible: 0
  }
}

workflow fix_pheweb {
  String docker
  File pheno_json
  File matrix_file
  File bed_file
  Int disk
  Int mem
  Int cpu

  call best_phenos_by { input : bed_file=bed_file ,
                                docker=docker ,
                                pheno_json=pheno_json ,
                                matrix_file=matrix_file ,
                                disk=disk ,
                                cpu=cpu ,
                                mem=mem }
}

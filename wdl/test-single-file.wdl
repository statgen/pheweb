import "import.wdl" as pheweb_import

task create_custom_json {
  String phenocode
  String description

  command <<<
    echo -e '[ { "name" : "${phenocode}" , "phenostring" : "${description}" } ]'  > custom.json
  >>>

  runtime { docker: "python:3.8" }
  output { File custom_json = 'custom.json' }

}

task copy_summary {
  String file_url
  String phenocode
  String docker
  String root_dir = '/cromwell_root/'

  command {
    set -euxo pipefail
    python3 -c "import smart_open; import shutil; shutil.copyfileobj(smart_open.open('${file_url}','rb'), open('${root_dir}${phenocode}', 'wb'))"
  }
  # use the pheweb image as it has smart open
  runtime { docker: "${docker}" }
  output { File summary_file = "${root_dir}${phenocode}" }
}

task trivial_summary {
  String path

  command {  echo ${path} > summary_files.tsv }

  runtime { docker: "python:3.8" }
  output { File summary_files = 'summary_files.tsv' }
}

workflow import_single_file {
  String phenocode
  String description
  String file_url
  String docker
  call create_custom_json { input : phenocode = phenocode ,
                            description = description }
  call copy_summary { input : file_url = file_url ,
                      phenocode = phenocode ,
                      docker = docker }
  call trivial_summary { input : path = copy_summary.summary_file }
  call pheweb_import.import_pheweb { input :
       docker = docker ,
       disk = 1000 ,
       mem = 16 ,
       custom_json = create_custom_json.custom_json ,
       fields = [ "phenostring" ] ,
       summary_files = trivial_summary.summary_files
  }
}

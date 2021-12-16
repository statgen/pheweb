import "import.wdl" as pheweb_import

# Test script to run each step of
# the import on a single file.

task create_summary {
  String summary_file
  String dir = '/cromwell_root/'
  String out_filename = 'summary_files.txt'
  command <<<
    cd ${dir}
    echo ${summary_file} > ${out_filename}
  >>>
  output {
    File out_file = "${dir}${out_filename}"
  }
}

workflow test_import_pheweb {
  String docker
  String summary_file
  Int disk
  File bed_file
  Int mem
  Int cpu
  
  #1. preprocess
  #failure
  #call pheweb_import.preprocess { input : docker = docker , summary_file = summary_file , preprocessor = 'cut -f2' }
  call pheweb_import.preprocess { input : docker = docker , summary_file = summary_file }
  #2. sites
  call pheweb_import.sites { input : docker = docker , summary_files = [preprocess.out_file] , disk = disk }
  #3. annotation
  call pheweb_import.annotation { input : docker = docker , bed_file = bed_file , variant_list = sites.variant_list , mem = mem }
  #4. pheno
  call pheweb_import.pheno { input : docker = docker , variant_list = sites.variant_list , pheno_file=preprocess.out_file , file_affix='_' }
  #5. matrix
  call pheweb_import.matrix { input: sites=annotation.sites_list ,
                                     pheno_gz=[pheno.pheno_gz],
                                     manhattan=[pheno.pheno_manhattan],
                                     bed_file = bed_file,
                                     docker=docker,
                                     mem = mem ,  
                                     disk = disk,
                                   cpu = cpu }
  call create_summary { input : summary_file=summary_file }
  #6. end-to-end
  call pheweb_import.import_pheweb { input: docker = docker ,
                                            summary_files = create_summary.out_file , 
                                            disk = disk,
                                            mem = mem,
  	                                    bed_file = bed_file }
}

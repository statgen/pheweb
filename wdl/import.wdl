task preprocess {
  # after this task it is assumed the file
  # is of form chrom, pos, ref, alt, pval, beta, sebeta ...
  # see format-summary-file for details
  
  File summary_file
  String docker

  String? preprocessor
  
  String? chrom_column
  String chrom_flag = if defined(chrom_column) then "--chrom  '${chrom_column}'" else ""

  String? pos_column
  String pos_flag = if defined(pos_column) then "--pos  '${pos_column}'" else ""
  
  String? ref_column
  String ref_flag = if defined(ref_column) then "--ref  '${ref_column}'" else ""
  
  String? alt_column
  String alt_flag = if defined(alt_column) then "--alt  '${alt_column}'" else ""
  
  String? pval_column
  String pval_flag = if defined(pval_column) then "--pval  '${pval_column}'" else ""

  
  String? mlogp_column
  String mlogp_flag = if defined(mlogp_column) then "--mlogp  '${mlogp_column}'" else ""

  
  String? beta_column
  String beta_flag = if defined(beta_column) then "--beta  '${beta_column}'" else ""

  
  String? se_beta_column
  String se_beta_flag = if defined(se_beta_column) then "--se_beta  '${se_beta_column}'" else ""

  String? rename
  String rename_flag = if defined(rename) then "--rename '${rename}'" else ""

  String? exclude
  String exclude_flag = if defined(exclude) then "--exclude '${exclude}'" else ""
  
  String normalized_filename = sub(sub(basename(summary_file), ".gz$", ""), ".bgz$", "")
  String out_filename = "${normalized_filename}.gz"

  String dir = '/cromwell_root/'

  command <<<
	   set -euxo pipefail
     	   cd ${dir}

	   cat "${summary_file}" | \
           cat | (if [[ "${summary_file}" == *.gz || "${summary_file}" == *.bgz ]]; then zcat ; else cat ; fi) | \
           ${default="cat" preprocessor } | \
           pheweb format-summary-file ${chrom_flag} ${pos_flag} ${ref_flag} ${alt_flag} ${pval_flag} ${mlogp_flag} ${beta_flag} ${se_beta_flag} | \
           sort -t$'\t' -k1,1n -k2,2n -k3,3 -k4,4 | \
           bgzip > "${dir}${out_filename}"

           du -h "${dir}${out_filename}"
           
  >>>

  output {
     	    File out_file = "${dir}${out_filename}"
  }
     
  runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "8 GB"
        bootDiskSizeGb: 50
        disks: "local-disk 200 HDD"
        zones: "europe-west1-b"
        preemptible: 0
  }
}

task sites {
           Array[File] summary_files
     	   String docker
           String disk
	   # There is a pheweb command `pheweb sites`
     	   # that generates the list of variants.
     	   # this is a bash replacement for that command
	   
     command <<<
        for file in ${sep="\t" summary_files}; do
	   
	   # decompress if suffixes indicate compression
	   cat "$file" | \

       (if [[ "$file" == *.gz || "$file" == *.bgz ]]; then zcat ; else cat ; fi)  | \
	      cut -d$'\t' -f1-4| \
	      sed '1d' | \
	      sort -t$'\t' -k1,1n -k2,2n -k3,3 -k4,4 > "$file.tmp"
	   # replace orginal file
	   mv "$file.tmp" "$file"
	   # write the list of files to file in case too long
	   # for commandline
	   echo $file >> summary_files.tsv
	done
	# output header
        # then using the list of files sort and merge
        # python memory script
     	(echo -e 'chrom\tpos\tref\talt' ; cat summary_files.tsv | tr '\n' '\0' | sort --merge --unique --files0-from=- -t$'\t' -k1,1n -k2,2n -k3,3 -k4,4) > sites.tsv
     >>>
     
     output {
        File variant_list = "sites.tsv"
     }

   runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "2 GB"
        bootDiskSizeGb: 50
        disks: "local-disk ${disk} HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

task annotation {
     String docker
     Int mem
  
     File? rsids_file
     File bed_file

     File variant_list
    
    String dir = '/cromwell_root/'
    command <<<
	set -euxo pipefail
	cd ${dir}

        mkdir -p pheweb/generated-by-pheweb/parsed
	mkdir -p pheweb/generated-by-pheweb/tmp
	mkdir -p pheweb/generated-by-pheweb/sites/genes
	mkdir -p pheweb/generated-by-pheweb/sites/dbSNP

	# TODO test cache
	# TODO this file also appears : generated-by-pheweb/sites/dbSNP/dbsnp-b151-GRCh38.gz 
	[[ -z "${rsids_file}" ]] || mv ${rsids_file} pheweb/generated-by-pheweb/sites/dbSNP/
	[[ -z "${bed_file}" ]] || mv ${bed_file}   pheweb/generated-by-pheweb/sites/genes/
	mv ${variant_list} pheweb/generated-by-pheweb/sites/sites-unannotated.tsv
	
 	cd pheweb

        df -h && pheweb add-rsids
        df -h && pheweb add-genes
        df -h && pheweb make-cpras-rsids-sqlite3
        df -h && pheweb make-gene-aliases-sqlite3

	find ./
    >>>

    output {
	File sites_list = "${dir}pheweb/generated-by-pheweb/sites/sites.tsv"
	File gene_aliases_sqlite3 = "${dir}pheweb/generated-by-pheweb/resources/gene_aliases-vv25.sqlite3"
	File cpras_rsids_sqlite3 = "${dir}pheweb/generated-by-pheweb/sites/cpras-rsids.sqlite3"
   }

   runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "${mem} GB"
        bootDiskSizeGb: 50
        disks: "local-disk 100 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}


task pheno {
    	String docker
	File variant_list
	File pheno_file
    	String file_affix
     
        String base_name = sub(basename(pheno_file), file_affix, "")
        String pheno_name = sub(base_name, ".gz$", "")
        String dir = '/cromwell_root/'


	String gz_file = "${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz"
 	String tbi_file = "${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz.tbi"
	String manhattan_file = "${dir}pheweb/generated-by-pheweb/manhattan/${pheno_name}.json"
    	String qq_file = "${dir}pheweb/generated-by-pheweb/qq/${pheno_name}.json"

        command <<<

        set -euxo pipefail

        mkdir -p pheweb/generated-by-pheweb/parsed
	mkdir -p pheweb/generated-by-pheweb/sites
	mkdir -p pheweb/generated-by-pheweb/pheno_gz
	
	mv ${variant_list} pheweb/generated-by-pheweb/sites/
	
	# pipeline to file without compression suffix if there is one
	cat ${pheno_file} | \
	(if [[ "${pheno_file}" == *.gz || "${pheno_file}" == *.bgz ]]; then zcat ; else cat ; fi) | \
	sed '1 s/^#chrom/chrom/ ; '  > pheweb/generated-by-pheweb/parsed/${pheno_name}
	
        cd pheweb

        pheweb phenolist glob generated-by-pheweb/parsed/* && \
        pheweb phenolist extract-phenocode-from-filepath --simple && \
        pheweb augment-phenos && \
        pheweb manhattan && \
        pheweb qq && \
        pheweb bgzip-phenos &&
        find ./ 
	# find just to make sure the whole sequence is completed
	# and you know what you have.
	
	>>>


   output {
	File pheno_gz = gz_file
 	File pheno_tbi = tbi_file
	File pheno_manhattan = manhattan_file
	File pheno_qq = qq_file
   }
   
   runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "10 GB"
        bootDiskSizeGb: 50
        disks: "local-disk 200 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}


task matrix {

    File sites
    File bed_file
    Array[File] pheno_gz
    Array[File] manhattan
    String docker

    Int cpu
    Int disk
    Int mem

    command <<<
        set -euxo pipefail
        mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mkdir -p pheweb/generated-by-pheweb/pheno_gz && \
            mkdir -p pheweb/generated-by-pheweb/manhattan && \
            mkdir -p /root/.pheweb/cache && \
            [[ -z "${bed_file}" ]] || mv ${bed_file} /root/.pheweb/cache/ && \
            mv ${sep=" " pheno_gz} pheweb/generated-by-pheweb/pheno_gz/ && \
            mv ${sep=" " manhattan} pheweb/generated-by-pheweb/manhattan/ && \
            cd pheweb && \
            pheweb phenolist glob generated-by-pheweb/pheno_gz/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple

        for file in generated-by-pheweb/pheno_gz/*; do
            pheno=`basename $file | sed 's/.gz//g' | sed 's/.pheweb//g'`
            printf "$pheno\t$pheno\t0\t0\t$file\n" >> pheno_config.txt
        done
        n_pheno=$(wc -l pheno_config.txt | cut -d' ' -f1)
        n_batch=$((n_pheno/${cpu}+1))
        split -d -l $n_batch --additional-suffix pheno_piece pheno_config.txt

        tail -n+2 ${sites} > ${sites}.noheader
        python3 <<EOF
        import os,glob,subprocess,time
        files = sorted(glob.glob("*pheno_piece"))
        import multiprocessing
        def multiproc(i):
            file = sorted(glob.glob("*pheno_piece"))[i]
            print(file)
            cmd = ["external_matrix.py", file, file + ".", "${sites}.noheader", "--chr", "#chrom", "--pos", "pos", "--ref", "ref", "--alt", "alt", "--no_require_match", "--no_tabix", "--all_fields"]
            start = time.time()
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            out,err = [elem.decode("utf-8").strip() for elem in p.communicate()]
            print(f"{i}: file done.")
            print("ERR: ",err)
            print(f"It took {time.time() - start} seconds.")

        cpus = multiprocessing.cpu_count()
        pools = multiprocessing.Pool(cpus - 1)
        pools.map(multiproc,range(len(files)))
        pools.close()

        EOF

        cmd="paste <(cat ${sites} | sed 's/chrom/#chrom/') "
        for file in *pheno_piece.matrix.tsv; do
            cmd="$cmd <(cut -f5- $file) "
        done
        echo $cmd | bash | bgzip -@ $((${cpu}-1)) > generated-by-pheweb/matrix.tsv.gz

        tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/matrix.tsv.gz

        pheweb top-hits

        python3 <<EOF
        import glob
        import subprocess
        import json,time
        import multiprocessing
        # get gene-to-pheno json per piece
        files =  glob.glob("*pheno_piece.matrix.tsv")
        def multiproc(i):
            file = sorted(glob.glob("*pheno_piece.matrix.tsv"))[i]
            print(file)
            cmd = ["pheweb", "gather-pvalues-for-each-gene", file]
            start = time.time()
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            out,err = [elem.decode("utf-8").strip() for elem in p.communicate()]
            print(f"{i}: file done.")
            print("ERR: ",err)
            print(f"It took {time.time() - start} seconds.")

        cpus = multiprocessing.cpu_count()
        pools = multiprocessing.Pool(cpus - 1)
        pools.map(multiproc,range(len(files)))
        pools.close()

        # collect jsons
        gene2phenos = {}
        for file in glob.glob("*pheno_piece.matrix.tsv_best-phenos-by-gene.json"):
            with open(file) as f:
                j = json.load(f)
                for gene in j:
                    if gene not in gene2phenos:
                        gene2phenos[gene] = []
                    gene2phenos[gene].extend(j[gene])
        for gene in gene2phenos:
            phenos = sorted(gene2phenos[gene], key=lambda x: x['pval'])
            n_sig = len([p for p in phenos if p['pval'] < 5e-8])
            gene2phenos[gene] = phenos[:max(4,n_sig)]
        with open('generated-by-pheweb/best-phenos-by-gene.json', 'w') as f:
            json.dump(gene2phenos, f)
        EOF
    # TODOD : verify number of columns
    >>>

    output {
        File phenolist = "pheweb/pheno-list.json"
        File matrix = "pheweb/generated-by-pheweb/matrix.tsv.gz"
        File matrix_tbi = "pheweb/generated-by-pheweb/matrix.tsv.gz.tbi"
        File top_hits_json = "pheweb/generated-by-pheweb/top_hits.json"
        File top_hits_tsv = "pheweb/generated-by-pheweb/top_hits.tsv"
        File top_hits_1k = "pheweb/generated-by-pheweb/top_hits_1k.json"
        File pheno_gene = "pheweb/generated-by-pheweb/best-phenos-by-gene.json"
        Array[File] tmp = glob("pheweb/generated-by-pheweb/tmp/*")
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


workflow import_pheweb {
	 String docker
	 String summary_files
	 String? file_affix

         Int disk
         Int mem
  
	 Array[String] pheno_files = read_lines(summary_files)
         # get file from here https://resources.pheweb.org/
         # https://resources.pheweb.org/genes-v37-hg38.bed
	 File bed_file
	 File? rsids_file

	 scatter (pheno_file in pheno_files) {
	    call preprocess { input :
               summary_file = pheno_file ,
               docker = docker ,
	       }
         }

	 call sites { input :
           summary_files = preprocess.out_file ,
           docker = docker,
	   disk=disk
         }

	 call annotation { input :
            variant_list = sites.variant_list ,
	    mem = mem ,  
	    bed_file = bed_file ,
	    rsids_file = rsids_file ,
            docker = docker
         }
	 
	 scatter (pheno_file in preprocess.out_file) {
	 	 call pheno { input :
	 	      	      variant_list = annotation.sites_list ,
	       	      	      pheno_file = pheno_file ,
	       	       	      file_affix = if defined(file_affix) then file_affix else "",
              	       	      docker = docker
	 	 }
	}

        call matrix { input:
	              sites=annotation.sites_list ,
		      pheno_gz=pheno.pheno_gz,
		      manhattan=pheno.pheno_manhattan,
		      bed_file = bed_file,
		      docker=docker,
	              mem = mem ,  
                      disk=disk
        }	    
}

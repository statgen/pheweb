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
        set -euxo pipefail

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
     Array[String] output_url

    command <<<
	set -euxo pipefail
	cd ${dir}

        mkdir -p pheweb/generated-by-pheweb/parsed
	mkdir -p pheweb/generated-by-pheweb/tmp
	mkdir -p pheweb/generated-by-pheweb/sites/genes
	mkdir -p pheweb/generated-by-pheweb/sites/dbSNP

	# TODO test cache
	# TODO this file also appears : generated-by-pheweb/sites/dbSNP/dbsnp-b151-GRCh38.gz
	[[ -z "${rsids_file}" ]] || mv ${rsids_file} pheweb/generated-by-pheweb/sites/dbSNP/rsids-b38-dbsnp151.vcf.gz
        [[ -z "${bed_file}" ]] || mv ${bed_file}   pheweb/generated-by-pheweb/sites/genes/genes-b38-v37.bed
        # allow for compressed sites file
	cat ${variant_list} | (if [[ "${variant_list}" == *.gz || "${variant_list}" == *.bgz ]]; then zcat ; else cat ; fi) > pheweb/generated-by-pheweb/sites/sites-unannotated.tsv

 	cd pheweb

        df -h && pheweb add-rsids
        df -h && pheweb add-genes --genes-filepath ${dir}/pheweb/generated-by-pheweb/sites/genes/genes-b38-v37.bed
        df -h && pheweb make-cpras-rsids-sqlite3
        df -h && pheweb make-gene-aliases-sqlite3

        find ./

        gcloud auth list

        for url in ${sep="\t" output_url}; do

        /pheweb/scripts/copy_files.sh ${dir}/pheweb/generated-by-pheweb/sites/sites.tsv                $url/generated-by-pheweb/sites/sites.tsv
        /pheweb/scripts/copy_files.sh ${dir}/pheweb/generated-by-pheweb/resources/gene_aliases.sqlite3 $url/generated-by-pheweb/resources/gene_aliases.sqlite3
        /pheweb/scripts/copy_files.sh ${dir}/pheweb/generated-by-pheweb/sites/cpras-rsids.sqlite3      $url/generated-by-pheweb/sites/cpras-rsids.sqlite3
        /pheweb/scripts/copy_files.sh ${dir}/pheweb/generated-by-pheweb/sites/genes/genes-b38-v37.bed  $url/cache/genes-b38-v37.bed

        done

    >>>

    output {
	File sites_list = "${dir}pheweb/generated-by-pheweb/sites/sites.tsv"
	File gene_aliases_sqlite3 = "${dir}pheweb/generated-by-pheweb/resources/gene_aliases.sqlite3"
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


task webdav_directories {

    Array[String] output_url
    String docker
    File bed_file

  command <<<

    for url in ${sep="\t" output_url}; do

    if [ "$url" = http* ]; then
      # we ignore failures as directories may alread by created
      curl -X MKCOL "$url/generated-by-pheweb/" || true
      curl -X MKCOL "$url/generated-by-pheweb/sites/" || true
      curl -X MKCOL "$url/generated-by-pheweb/resources/" || true
      curl -X MKCOL "$url/generated-by-pheweb/pheno_gz/" || true
      curl -X MKCOL "$url/generated-by-pheweb/manhattan/" || true
      curl -X MKCOL "$url/generated-by-pheweb/qq/" || true
      curl -X MKCOL "$url/cache/" || true
    fi
    done
    >>>

    runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "2 GB"
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

        Array[String] output_url


	String gz_file = "${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz"
 	String tbi_file = "${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz.tbi"
	String manhattan_file = "${dir}pheweb/generated-by-pheweb/manhattan/${pheno_name}.json"
    	String qq_jsons = "${dir}pheweb/generated-by-pheweb/qq/${pheno_name}.json"

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

        for url in ${sep="\t" output_url}; do

        /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz      $url/generated-by-pheweb/pheno_gz/${pheno_name}.gz
	/pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/pheno_gz/${pheno_name}.gz.tbi  $url/generated-by-pheweb/pheno_gz/${pheno_name}.gz.tbi
	/pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/manhattan/${pheno_name}.json   $url/generated-by-pheweb/manhattan/${pheno_name}.json
	/pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/qq/${pheno_name}.json          $url/generated-by-pheweb/qq/${pheno_name}.json

	done
	>>>

   output {
	File pheno_gz = gz_file
 	File pheno_tbi = tbi_file
	File pheno_manhattan = manhattan_file
	File pheno_qq = qq_jsons
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

    Array[String] output_url

    String dir = '/cromwell_root/'

    command <<<
        set -euxo pipefail
        mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mkdir -p pheweb/generated-by-pheweb/pheno_gz && \
            mkdir -p pheweb/generated-by-pheweb/manhattan && \
            mkdir -p /root/.pheweb/cache && \
            [[ -z "${bed_file}" ]] || mv ${bed_file} /root/.pheweb/cache/genes-b38-v37.bed && \
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
    cmd = ["external_matrix.py", file, file + ".", "${sites}.noheader", "--chr", "#chrom", "--pos", "pos", "--ref", "ref", "--alt", "alt", "--no_require_match", "--no_tabix", "--all_fields" , "--exclude_field" , "rsids,nearest_genes" ]
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
      # TODO : verify number of columns
      find "${dir}"

      for url in ${sep="\t" output_url}; do

      #skipping pheno-list.json as it is written in the the fix json step
      #/pheweb/scripts/copy_files.sh "${dir}pheweb/pheno-list.json"                                "$url/pheno-list.json")
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/matrix.tsv.gz              $url/generated-by-pheweb/matrix.tsv.gz
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/matrix.tsv.gz.tbi          $url/generated-by-pheweb/matrix.tsv.gz.tbi
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/top_hits.json              $url/generated-by-pheweb/top_hits.json
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/top_hits.tsv               $url/generated-by-pheweb/top_hits.tsv
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/top_hits_1k.json           $url/generated-by-pheweb/top_hits_1k.json
      /pheweb/scripts/copy_files.sh ${dir}pheweb/generated-by-pheweb/best-phenos-by-gene.json   $url/generated-by-pheweb/best-phenos-by-gene.json

      done
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




task fix_json {

    Array[String] output_url

    # standard json to edit
    File pheno_json
    # json with metata provided
    # a list containg an element for each phenotype
    # [ { 'phenocode' : <your phenotype> , <extra fields> } , .... ]
    File custom_json
    Array[String] fields
    # qq_json info from which to extract lambda and sig hits
    Array[File] qq_jsons
    Array[File] man_jsons

    String docker
    String root_dir = '/cromwell_root/'

    # need to loop over phenos in pheno_json


   command <<<
set -euxo pipefail
python3 <<CODE
DATA_DIR = '${root_dir}'
PHENO_JSON = '${pheno_json}'
CUSTOM_JSON = '${custom_json}'
print(DATA_DIR,PHENO_JSON)

import json,os
with open(PHENO_JSON) as f:phenolist = json.load(f)
with open(CUSTOM_JSON) as f: custom_jsons = {elem['phenocode']:elem for elem in json.load(f)}
fields = "${sep="," fields}".split(",")
print(fields)

def find(name, path,subpath):
    for root, dirs, files in os.walk(path):
        if name in files and subpath in root:
            return os.path.join(root, name)

final_json = []
for p_dict in phenolist:
    print(p_dict)
    pheno = p_dict['phenocode']
    print(pheno,custom_jsons[pheno])
    # FIND QQ PLOT
    p_qq = find(pheno +".json",DATA_DIR,'qq')
    with open(p_qq) as f: qq = json.load(f)
    # FIND MANAHTTAN PLOT
    p_m = find(pheno +".json",DATA_DIR,'manhattan')
    with open(p_m) as f: manha = json.load(f)

    # UPDATE P_DICT
    p_dict['gc_lambda'] = qq['overall']['gc_lambda']
    p_dict['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])
    # remove empty strings - empty lists become a list with empty string
    for key in [k for k in fields if k ]: p_dict[key] = custom_jsons[pheno][key]

    final_json.append(p_dict)

with open('./new_pheno.json', 'a') as outfile: json.dump(final_json, outfile, indent=2)

CODE

     cat "${root_dir}new_pheno.json"

     for url in ${sep="\t" output_url}; do
          /pheweb/scripts/copy_files.sh ${root_dir}new_pheno.json $url/pheno-list.json
     done
>>>

    output {
        File json ='/cromwell_root/new_pheno.json'
    }

   runtime {
        docker: "${docker}"
        cpu: 1
        memory: "2 GB"
        disks: "local-disk 5 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

task exec_cmd {
  # we don't want to cache this
  # see :
  # https://cromwell.readthedocs.io/en/stable/optimizations/VolatileTasks/
  # https://github.com/broadinstitute/cromwell/issues/1695
  Array[String] cmd
  String docker


  command <<<
    set -euxo pipefail
    date
    ${sep="&&" cmd}
  >>>
  runtime {
        docker: "${docker}"
        cpu: 1
        memory: "2 GB"
        disks: "local-disk 5 HDD"
        zones: "europe-west1-b"
        preemptible: 0
  }
  meta {
    volatile: "true"
  }


}

task filter_sumstat {

    File sumstat
    String docker
    String pheno_col
    Float pval_thres

    String fname_prefix = sub(basename(sumstat), ".gz", "")
    Int disk_size = ceil(size(sumstat, "GB") * 3) + 5

    command <<<

    header=$(echo -e "${pheno_col}\t$(zcat ${sumstat} | head -1)");

    set -euxo pipefail

    # input:  a (gzipped) tab-delimited sumstat uri
    # output: a headerless p-value filtered bgzipped sumstat file
    #
    # filters the sumstat to p-values below the given threshold (threshold can be 1 for no filtering)
    # sort order in the output will be chromosome, position, alleles and pheno
    # 
    # possible chr prefix will be removed, possible 23 will be changed to X

    catcmd() {
        zcat -f ${sumstat}
    }
    pheno=`basename ${sumstat} | sed 's/.gz$//'`    
    catcmd() {
        zcat -f ${sumstat} | awk -v pheno=$pheno 'BEGIN {FS=OFS="\t"} NR==1 {print "${pheno_col}",$0} NR>1 {print pheno,$0}'
    }

    catcmd | awk '
    BEGIN {FS=OFS="\t"}
    NR==1 {
        for(i=1;i<=NF;i++) {
            h[$i]=i;
            echo "header: h[$i]";
        }
    }    

    split("$header", col_arr, "\t");
    NR>1 && $h["pval"] <= ${pval_thres} {
        # in chromosome name remove chr prefix and replace 23 with X
        chr=$h["#chrom"];
        sub("^chr", "", chr);
        if(chr==23) chr="X";
        $h["#chrom"]=chr;
        for(i=1;i in col_arr;i++){
            if (i == 1) printf $h[col_arr[i]];
            else printf "\t"$h[col_arr[i]];
        }
    printf "\n";
    }' | \
    sort -k2,2V -k3,3g -k4,5 -k1,1 | \
    uniq | \
    bgzip > ${fname_prefix}.filtered.tsv.gz

    >>>    

    output {
        File out = "${fname_prefix}.filtered.tsv.gz"
        Float out_sumstat_size = size("${fname_prefix}.filtered.tsv.gz", "GB")
    }

    runtime {
        docker: "${docker}"
        memory: "2 GB"
        cpu: "1"
        bootDiskSizeGb: 50
        disks: "local-disk ${disk_size} SSD"
        zones: "europe-west1-b"
        preemptible: 0
    }

}

task get_phenolist {

    Array[File] pheno_gz
    Array[File] manhattan
    File bed_file
    String docker
    Int disk

    command <<<

    set -euxo pipefail
    n_cpu=`grep -c ^processor /proc/cpuinfo`

    mkdir -p pheweb/generated-by-pheweb/tmp && \
        echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
        mkdir -p pheweb/generated-by-pheweb/pheno_gz && \
        mkdir -p pheweb/generated-by-pheweb/manhattan && \
        mkdir -p /root/.pheweb/cache && \
        [[ -z "${bed_file}" ]] || mv ${bed_file} /root/.pheweb/cache/genes-b38-v37.bed && \
        mv ${sep=" " pheno_gz} pheweb/generated-by-pheweb/pheno_gz/ && \
        mv ${sep=" " manhattan} pheweb/generated-by-pheweb/manhattan/ && \
        cd pheweb && \
        pheweb phenolist glob generated-by-pheweb/pheno_gz/* && \
        pheweb phenolist extract-phenocode-from-filepath --simple

    >>>    

    output {
        File phenolist = "pheweb/pheno-list.json"
        Array[File] tmp = glob("pheweb/generated-by-pheweb/tmp/*")
    }

    runtime {
        docker: "${docker}"
        memory: "8 GB"
        cpu: "2"
        bootDiskSizeGb: 50
        zones: "europe-west1-b"
        disks: "local-disk ${disk} HDD"
        preemptible: 0
    }

}


task matrix_longformat {

    Array[File] sumstats
    Array[String] output_url
    Int batch_size
    String docker
    String out_columns
    Int disk
    Int cpu
    Int mem

    String dir = '/cromwell_root/'
    String filename = "long.tsv.gz"

    command <<<

    set -euxo pipefail
    n_cpu=`grep -c ^processor /proc/cpuinfo`

    echo `date` decompress

    in_file=$(echo "${sep=',' sumstats}" | cut -f 1 -d',');
    in_dir=$(echo $in_file | sed 's/^gs:\/\///' | cut -f 3 -d'/');
    find "/cromwell_root/$in_dir" -name "*.tsv.gz" | xargs -P $n_cpu -I{} gzip -d --force {}
    find "/cromwell_root/$in_dir" -name "*.tsv" | tr '\n' '\0' > merge_these
    
    echo `date` merge
    time \
    cat \
    <(echo "${out_columns}" | tr ' ' '\t') \
    <(sort \
    -m \
    -T . \
    --parallel=$n_cpu \
    --compress-program=gzip \
    --files0-from=merge_these \
    --batch-size=${batch_size} \
    -k2,2V -k3,3g -k4,5 -k1,1) \
    | bgzip -@$n_cpu > ${filename}

    echo `date` tabix
    tabix -s 2 -b 3 -e 3 ${filename}

    echo `date` end

    find "${dir}"
    for url in ${sep="\t" output_url}; do
        /pheweb/scripts/copy_files.sh "${filename}"              $url/generated-by-pheweb/"${filename}"
        /pheweb/scripts/copy_files.sh "${filename}.tbi"          $url/generated-by-pheweb/"${filename}.tbi"
    done

    >>>    

    runtime {
        docker: "${docker}"
        cpu: "${cpu}"
        memory: "${mem} GB"
        bootDiskSizeGb: 50
        zones: "europe-west1-b"
        disks: "local-disk ${disk} HDD"
        preemptible: 0
    }

}

# calculating sum of elements in the array
# This task is needed for getting total size of array
task sum {

  Array[Float] values
  String docker

  command <<<
    python3 -c "print(${sep="+" values})"
  >>>

  output {
    Float out = read_float(stdout())
  }

  runtime {
    docker: "${docker}"
    memory: "1 GB"
    cpu: "1"
    disks: "local-disk 1 SSD"
  }

}

workflow import_pheweb {
         # this variable is to make sure the json file matches the import version
	 String docker
	 String summary_files
     Boolean generate_longformat_matrix

	 String? file_affix
         String? sites_file
         Array[String]? post_import = []
         Array[String]? output_url = []

         File custom_json
         Array[String] fields

         Int disk
         Int mem

	 Array[String] pheno_files = read_lines(summary_files)
         # get file from here https://resources.pheweb.org/
         # https://resources.pheweb.org/genes-v37-hg38.bed
	 File bed_file
	 File? rsids_file

    # for merging sumstats files into a long format file
    Float pval_thres

         call webdav_directories { input :
 	     output_url = output_url ,
	     docker = docker ,
	     bed_file = bed_file
         }


	 scatter (pheno_file in pheno_files) {
	    call preprocess { input :
               summary_file = pheno_file ,
               docker = docker ,
	       }
         }

	 if (!defined(sites_file)) {
	   call sites { input :
              summary_files = preprocess.out_file ,
              docker = docker,
	      disk=disk
           }
	 }

	 call annotation { input :
	    output_url = output_url,
            variant_list = if defined(sites_file) then sites_file else sites.variant_list ,
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
                              docker = docker,
	                      output_url = output_url
	 	 }
	}

    if (!generate_longformat_matrix) {
        call matrix { 
            input: sites=annotation.sites_list ,
                   pheno_gz=pheno.pheno_gz,
                   manhattan=pheno.pheno_manhattan,
                   bed_file = bed_file,
                   docker=docker,
                   mem = mem ,
                   disk=disk ,
                   output_url = output_url
        }
    }

    if (generate_longformat_matrix) {
        call get_phenolist{
            input: pheno_gz = pheno.pheno_gz,
                   manhattan = pheno.pheno_manhattan,
                   bed_file = bed_file,
                   disk = disk,
                   docker = docker
        }

        scatter(file in pheno.pheno_gz) {
            call filter_sumstat{
                input: sumstat = file,
                       pval_thres = pval_thres,
                       docker = docker
            }
        }

        # get total size of filtered pheno_gz files
        call sum as pheno_files_size {
            input:  values = filter_sumstat.out_sumstat_size,
                    docker = docker
        }
    
        call matrix_longformat {
            input:  sumstats = filter_sumstat.out,
                    output_url = output_url,
                    disk = ceil(pheno_files_size.out * 5) + 20,
                    mem =  mem,
                    docker = docker
        }
    }
    
    File phenolist = select_first([get_phenolist.phenolist, matrix.phenolist])

	call fix_json{
        input:
          pheno_json = phenolist ,
          qq_jsons = pheno.pheno_qq ,
          man_jsons = pheno.pheno_manhattan ,
          docker = docker ,
	  output_url = output_url ,
	  custom_json = custom_json ,
          fields = fields
        }

        if(defined(post_import)){
          call exec_cmd { input :
	  docker = docker ,
	  cmd = post_import }
	}

}

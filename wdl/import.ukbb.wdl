
task fix_json {

    # standard json to edit
    File pheno_json
    # json with metata provided
    File custom_json
    Array[String] fields
    # qq_json info from which to extract lambda and sig hits
    Array[File] qq_jsons
    Array[File] man_jsons

    String docker
    String? json_docker
    String? final_docker = if defined(json_docker) then json_docker else docker
    # ned to loop over phenos in pheno_json
    command <<<
    set -euxo pipefail
    python3 <<CODE
    DATA_DIR = '/cromwell_root/'
    PHENO_JSON = '${pheno_json}'
    CUSTOM_JSON = '${custom_json}'
    print(DATA_DIR,PHENO_JSON)

    import json,os
    with open(PHENO_JSON) as f:phenolist = json.load(f)
    with open(CUSTOM_JSON) as f: custom_jsons = {elem['name']:elem for elem in json.load(f)}
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
        for key in fields: p_dict[key] = custom_jsons[pheno][key]

        final_json.append(p_dict)

    with open('./new_pheno.json', 'a') as outfile: json.dump(final_json, outfile, indent=2)

    CODE
    >>>

    output {
        File json ='/cromwell_root/new_pheno.json'
    }

   runtime {
        docker: "${final_docker}"
    	cpu: 1
    	memory: "3 GB"
        disks: "local-disk 5 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

task annotation {

    File phenofile
    String? annotation_docker
    Map[String,String] header_dict
    Boolean filter_na
    
    File marisa_trie
    String docker
    String? final_docker = if defined(annotation_docker) then annotation_docker else docker
    String dir = '/cromwell_root/'
    command {
        set -euxo pipefail
        python3 /pheweb/scripts/filter_sumstats.py ${phenofile} ${write_map(header_dict)} ${if filter_na then "--filter-na" else ""}
	cd ${dir}

        mkdir -p pheweb/generated-by-pheweb/parsed && \
        mkdir -p pheweb/generated-by-pheweb/tmp && \
        echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
        mkdir -p pheweb/generated-by-pheweb/sites/genes  && \
        mv ${marisa_trie} pheweb/generated-by-pheweb/sites/genes/  && \
        mv ${phenofile} pheweb/generated-by-pheweb/parsed/ && \
        cd pheweb && \
        if [ -f generated-by-pheweb/parsed/*.gz ]; then gunzip generated-by-pheweb/parsed/*.gz; fi && \
        echo '''cache=False''' > ./config.py

        df -h
        echo "dirs created"
        echo "-----------------------------------------------"
        echo "phenolist glob"
        echo "-----------------------------------------------"

        df -h && pheweb phenolist glob generated-by-pheweb/parsed/*
        echo "-----------------------------------------------"
        echo "phenolist extract"
        echo "-----------------------------------------------"
        df -h &&  pheweb phenolist extract-phenocode-from-filepath --simple

        echo "-----------------------------------------------"
        echo "phenolist sites"
        echo "-----------------------------------------------"
        df -h && pheweb sites

        echo "-----------------------------------------------"
        echo "gene aliases"
        echo "-----------------------------------------------"
        df -h && pheweb make-gene-aliases-trie

        echo "-----------------------------------------------"
        echo "rsids"
        echo "-----------------------------------------------"
        df -h && pheweb add-rsids

        echo "-----------------------------------------------"
        echo "genes"
        echo "-----------------------------------------------"
        df -h && pheweb add-genes

        echo "-----------------------------------------------"
        echo "tries"
        echo "-----------------------------------------------"
        df -h && pheweb make-tries

        ls

    }

    output {
        Array[File] tmp = glob("${dir}pheweb/generated-by-pheweb/tmp/*")

        File trie1 = "${dir}pheweb/generated-by-pheweb/sites/cpra_to_rsids_trie.marisa"
        File trie2 = "${dir}pheweb/generated-by-pheweb/sites/rsid_to_cpra_trie.marisa"
        File gene_trie = "${dir}pheweb/generated-by-pheweb/sites/genes/gene_aliases_b38.marisa_trie"
        File bed = "${dir}pheweb/generated-by-pheweb/sites/genes/genes-b38-v25.bed"
        File sites = "${dir}pheweb/generated-by-pheweb/sites/sites.tsv"
    }

    runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "7 GB"
        bootDiskSizeGb: 50
        disks: "local-disk 100 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

task pheno {

    File phenofile
    String replace_prefix
    String base = sub(basename(phenofile), replace_prefix, "")
    String base_nogz = sub(base, ".gz$", "")
    File trie1
    File trie2
    File sites
    Map[String,String] header_dict
    Boolean filter_na
    
    String docker
    String? pheno_docker
    String? final_docker = if defined(pheno_docker) then pheno_docker else docker


    String dollar = "$"
    String tmp_gz = "pheweb/generated-by-pheweb/pheno_gz/" + base_nogz + ".gz"
    String tmp_tbi = "pheweb/generated-by-pheweb/pheno_gz/" + base_nogz + ".gz.tbi"
    String tmp_manhattan = "pheweb/generated-by-pheweb/manhattan/" + base_nogz + ".json"
    String tmp_qq = "pheweb/generated-by-pheweb/qq/" + base_nogz + ".json"

    Array[String] outputs = [tmp_gz,tmp_tbi,tmp_manhattan,tmp_qq]
    command <<<
        set -euxo pipefail

        echo "-----------------------------------------------"
        echo "CREATE DIRS"
        echo "-----------------------------------------------"

        while read f; do mkdir -p ${dollar}{f%/*} && touch ${dollar}f ; done < ${write_lines(outputs)}
        mkdir -p pheweb/generated-by-pheweb/parsed && \
        mkdir -p pheweb/generated-by-pheweb/tmp && \
        echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
        mkdir -p pheweb/generated-by-pheweb/sites

        echo "-----------------------------------------------"
        echo "COPY AND FIX FILES TO DIR"
        echo "-----------------------------------------------"

        python3 /pheweb/scripts/filter_sumstats.py ${phenofile} ${write_map(header_dict)} ${if filter_na then "--filter-na" else ""}
        mv ${phenofile} pheweb/generated-by-pheweb/parsed/${base} && \
        mv ${trie1} pheweb/generated-by-pheweb/sites/ && \
        mv ${trie2} pheweb/generated-by-pheweb/sites/ && \
        mv ${sites} pheweb/generated-by-pheweb/sites/ && \
        cd pheweb && \
        if [ -f generated-by-pheweb/parsed/*.gz ]; then gunzip generated-by-pheweb/parsed/*.gz; fi 

        echo "-----------------------------------------------"
        echo "PHEWEB TIME!"
        echo "-----------------------------------------------"

        pheweb phenolist glob generated-by-pheweb/parsed/* && \
        pheweb phenolist extract-phenocode-from-filepath --simple && \
        pheweb augment-phenos && \
        pheweb manhattan && \
        pheweb qq && \
        pheweb bgzip-phenos
    >>>

    output {
        Array[File] tmp = glob("pheweb/generated-by-pheweb/tmp/*")
        File pheno_gz = tmp_gz
        File pheno_tbi = tmp_tbi
        File manhattan = tmp_manhattan
        File qq = tmp_qq
    }

    runtime {
        docker: "${final_docker}"
    	cpu: 1
        memory: "3.75 GB"
        disks: "local-disk 20 HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

task matrix {

    File sites
    File genes_bed
    Array[File] pheno_gz
    Array[File] manhattan
    String cols

    String? matrix_docker
    String docker
    String? final_docker = if defined(matrix_docker) then matrix_docker else docker

    Int cpu
    Int disk

    command <<<
        set -euxo pipefail
        mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mkdir -p pheweb/generated-by-pheweb/pheno_gz && \
            mkdir -p pheweb/generated-by-pheweb/manhattan && \
            mkdir -p /root/.pheweb/cache && \
            mv ${genes_bed} /root/.pheweb/cache/ && \
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
        split -l $n_batch --additional-suffix pheno_piece pheno_config.txt

        tail -n+2 ${sites} > ${sites}.noheader
        python3 <<EOF
        import os
        import glob
        import subprocess
        FNULL = open(os.devnull, 'w')
        processes = set()
        for file in glob.glob("*pheno_piece"):
            processes.add(subprocess.Popen(["external_matrix.py", file, file + ".", "${sites}.noheader", "--chr", "#chrom", "--pos", "pos", "--ref", "ref", "--alt", "alt", "--other_fields", "${cols}", "--no_require_match", "--no_tabix"], stdout=FNULL))
        for p in processes:
            p.wait()
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
        import json
        # get gene-to-pheno json per piece
        processes = set()
        for file in glob.glob("*pheno_piece.matrix.tsv"):
            processes.add(subprocess.Popen(["pheweb", "gather-pvalues-for-each-gene", file]))
        for p in processes:
            p.wait()
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
        docker: "${final_docker}"
    	cpu: "${cpu}"
    	memory: "3 GB"
        disks: "local-disk ${disk} HDD"
        zones: "europe-west1-b"
        preemptible: 0
    }
}

workflow pheweb_import {

    File summaryfiles
    Array[String] phenofiles = read_lines(summaryfiles)
    String docker
    File genes_bed
    Map[String,String] header_dict
    Boolean filter_na


    ## as annotation step needs to be ran only once but needs a single sumstat containing all variants
    ## this file can be given and annotation step will be call cached in subsequent steps
    ## in case of call caching, e.g. the dbsnp annotation won't be refreshed but the old ones will be used.
    ## might get call cached even without this file if the first pheno in phenofiles has been used in annotation before.
    File? pre_annot_sumfile

    String? annot_sumstat = if defined(pre_annot_sumfile) then pre_annot_sumfile else phenofiles[0]

    call annotation {
        input: phenofile=annot_sumstat, docker=docker,header_dict = header_dict,filter_na = filter_na
    }

    scatter (phenofile in phenofiles) {
        call pheno {
            input: phenofile=phenofile, docker=docker, header_dict = header_dict,filter_na = filter_na
        }
    }

    call matrix {
        input: pheno_gz=pheno.pheno_gz, manhattan=pheno.manhattan, docker=docker, genes_bed = genes_bed
    }

    call fix_json{
        input:
        pheno_json = matrix.phenolist,
        qq_jsons = pheno.qq,
        man_jsons = pheno.manhattan,
        docker = docker
    }



}

task annotation {

    File phenofile
    String docker

    command {
        mkdir -p pheweb/generated-by-pheweb/parsed && \
            mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mv ${phenofile} pheweb/generated-by-pheweb/parsed/ && \
            cd pheweb && \
            if [ -f generated-by-pheweb/parsed/*.gz ]; then gunzip generated-by-pheweb/parsed/*.gz; fi && \
            sed -i 's/#chrom/chrom/' generated-by-pheweb/parsed/* && \
            pheweb phenolist glob generated-by-pheweb/parsed/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple && \
            pheweb sites && \
            pheweb make-gene-aliases-trie && \
            pheweb add-rsids && \
            pheweb add-genes && \
            pheweb make-tries && \
            mv /root/.pheweb/cache/gene_aliases_b38.marisa_trie generated-by-pheweb/ && \
            mv /root/.pheweb/cache/genes-b38-v25.bed generated-by-pheweb/
    }

    output {
        File trie1 = "pheweb/generated-by-pheweb/sites/cpra_to_rsids_trie.marisa"
        File trie2 = "pheweb/generated-by-pheweb/sites/rsid_to_cpra_trie.marisa"
        File gene_trie = "pheweb/generated-by-pheweb/gene_aliases_b38.marisa_trie"
        File sites = "pheweb/generated-by-pheweb/sites/sites.tsv"
        File bed = "pheweb/generated-by-pheweb/genes-b38-v25.bed"
        Array[File] tmp = glob("pheweb/generated-by-pheweb/tmp/*")
    }

    runtime {
        docker: "${docker}"
    	cpu: 2
    	memory: "7 GB"
        disks: "local-disk 50 SSD"
        preemptible: 0
    }
}

task pheno {

    File phenofile
    String base = sub(sub(basename(phenofile), ".gz.pheweb$", ""), ".pheweb", "")
    String base_nogz = sub(base, ".gz$", "")
    File trie1
    File trie2
    File sites
    String docker

    command {
        mkdir -p pheweb/generated-by-pheweb/parsed && \
            mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mkdir -p pheweb/generated-by-pheweb/sites && \
            mv ${phenofile} pheweb/generated-by-pheweb/parsed/${base} && \
            mv ${trie1} pheweb/generated-by-pheweb/sites/ && \
            mv ${trie2} pheweb/generated-by-pheweb/sites/ && \
            mv ${sites} pheweb/generated-by-pheweb/sites/ && \
            cd pheweb && \
            if [ -f generated-by-pheweb/parsed/*.gz ]; then gunzip generated-by-pheweb/parsed/*.gz; fi && \
            sed -i 's/#chrom/chrom/' generated-by-pheweb/parsed/* && \
            pheweb phenolist glob generated-by-pheweb/parsed/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple && \
            pheweb augment-phenos && \
            pheweb manhattan && \
            pheweb qq && \
            pheweb bgzip-phenos
    }

    output {
        File pheno = "pheweb/generated-by-pheweb/pheno/" + base_nogz
        File pheno_gz = "pheweb/generated-by-pheweb/pheno_gz/" + base_nogz + ".gz"
        File pheno_tbi = "pheweb/generated-by-pheweb/pheno_gz/" + base_nogz + ".gz.tbi"
        File manhattan = "pheweb/generated-by-pheweb/manhattan/" + base_nogz + ".json"
        File qq = "pheweb/generated-by-pheweb/qq/" + base_nogz + ".json"
        Array[File] tmp = glob("pheweb/generated-by-pheweb/tmp/*")
    }

    runtime {
        docker: "${docker}"
    	cpu: 1
    	memory: "3.75 GB"
        disks: "local-disk 20 SSD"
        preemptible: 1
        noAddress: true
    }
}

task matrix {

    File sites
    File bed
    Array[File] pheno_gz
    Array[File] manhattan
    String docker
    Int cpu
    Int mem
    Int disk
    String dollar = "$"

    command <<<

        mkdir -p pheweb/generated-by-pheweb/tmp && \
            echo "placeholder" > pheweb/generated-by-pheweb/tmp/placeholder.txt && \
            mkdir -p pheweb/generated-by-pheweb/pheno_gz && \
            mkdir -p pheweb/generated-by-pheweb/manhattan && \
            mkdir -p /root/.pheweb/cache && \
            mv ${bed} /root/.pheweb/cache/ && \
            mv ${sep=" " pheno_gz} pheweb/generated-by-pheweb/pheno_gz/ && \
            mv ${sep=" " manhattan} pheweb/generated-by-pheweb/manhattan/ && \
            cd pheweb && \
            pheweb phenolist glob generated-by-pheweb/pheno_gz/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple

        for file in generated-by-pheweb/pheno_gz/*; do
            pheno=`basename ${dollar}file | sed 's/.gz//g' | sed 's/.pheweb//g'`
            printf "${dollar}pheno\t${dollar}pheno\t0\t0\t${dollar}file\n" >> pheno_config.txt
        done
        n_pheno=${dollar}(wc -l pheno_config.txt | cut -d' ' -f1)
        n_batch=${dollar}((n_pheno/${cpu}+1))
        split -l ${dollar}n_batch --additional-suffix pheno_piece pheno_config.txt

        tail -n+2 ${sites} > ${sites}.noheader
        python3 <<EOF
        import os
        import glob
        import subprocess
        FNULL = open(os.devnull, 'w')
        processes = set()
        for file in glob.glob("*pheno_piece"):
            processes.add(subprocess.Popen(["external_matrix.py", file, file + ".", "${sites}.noheader", "--chr", "#chrom", "--pos", "pos", "--ref", "ref", "--alt", "alt", "--other_fields", "pval,beta,sebeta,maf,maf_cases,maf_controls", "--no_require_match", "--no_tabix"], stdout=FNULL))
        for p in processes:
            if p.poll() is None:
                p.wait()
        EOF

        cmd="paste <(cat ${sites} | sed 's/chrom/#chrom/') "
        for file in *pheno_piece.matrix.tsv; do
            cmd="${dollar}cmd <(cut -f5- ${dollar}file) "
        done
        echo ${dollar}cmd | bash | bgzip -@ ${dollar}((${cpu}-1)) > generated-by-pheweb/matrix.tsv.gz

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
        docker: "${docker}"
    	cpu: "${cpu}"
    	memory: "${mem} GB"
        disks: "local-disk ${disk} SSD"
        preemptible: 0
        noAddress: true
    }
}

workflow pheweb_import {

    File summaryfiles
    Array[String] phenofiles = read_lines(summaryfiles)
    String docker

    call annotation {
        input: docker=docker
    }

    scatter (phenofile in phenofiles) {
        call pheno {
            input: phenofile=phenofile, trie1=annotation.trie1, trie2=annotation.trie2, sites=annotation.sites, docker=docker
        }
    }

    call matrix {
        input: sites=annotation.sites, bed=annotation.bed, pheno_gz=pheno.pheno_gz, manhattan=pheno.manhattan, docker=docker
    }
}

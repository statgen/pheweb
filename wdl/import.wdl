task annotation {

    File phenofile
    String docker
    Int cpu
    Int mem
    Int disk
    String disktype

    command {
        mkdir -p pheweb/generated-by-pheweb/parsed && \
            mkdir -p pheweb/generated-by-pheweb/tmp && \
            mv ${phenofile} pheweb/generated-by-pheweb/parsed/ && \
            cd pheweb && \
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
    }

    runtime {
        docker: "${docker}"
    	cpu: "${cpu}"
    	memory: "${mem} GB"
        disks: "local-disk ${disk} ${disktype}"
        preemptible: 0
    }
}

task pheno {

    File phenofile
    String base = sub(basename(phenofile), ".gz.pheweb$", "")
    File trie1
    File trie2
    File sites
    String docker
    String disktype
    Int preemptible

    command {
        mkdir -p pheweb/generated-by-pheweb/parsed && \
            mkdir -p pheweb/generated-by-pheweb/tmp && \
            mkdir -p pheweb/generated-by-pheweb/sites && \
            mv ${phenofile} pheweb/generated-by-pheweb/parsed/${base} && \
            mv ${trie1} pheweb/generated-by-pheweb/sites/ && \
            mv ${trie2} pheweb/generated-by-pheweb/sites/ && \
            mv ${sites} pheweb/generated-by-pheweb/sites/ && \
            cd pheweb && \
            pheweb phenolist glob generated-by-pheweb/parsed/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple && \
            pheweb augment-phenos && \
            pheweb manhattan && \
            pheweb qq && \
            pheweb bgzip-phenos
    }

    output {
        File pheno = "pheweb/generated-by-pheweb/pheno/" + base
        File pheno_gz = "pheweb/generated-by-pheweb/pheno_gz/" + base + ".gz"
        File pheno_tbi = "pheweb/generated-by-pheweb/pheno_gz/" + base + ".gz.tbi"
        File manhattan = "pheweb/generated-by-pheweb/manhattan/" + base + ".json"
        File qq = "pheweb/generated-by-pheweb/qq/" + base + ".json"
    }

    runtime {
        docker: "${docker}"
    	cpu: 1
    	memory: "3 GB"
        disks: "local-disk 20 ${disktype}"
        preemptible: "${preemptible}"
    }
}

task matrix {

    File sites
    File bed
    Array[File] pheno
    Array[File] manhattan
    String docker
    Int cpu
    Int mem
    Int disk
    String disktype

    command {
        mkdir -p pheweb/generated-by-pheweb/sites && \
            mkdir -p pheweb/generated-by-pheweb/tmp && \
            mkdir -p pheweb/generated-by-pheweb/pheno && \
            mkdir -p pheweb/generated-by-pheweb/manhattan && \
            mkdir -p /root/.pheweb/cache && \
            mv ${sites} pheweb/generated-by-pheweb/sites/ && \
            mv ${bed} /root/.pheweb/cache/ && \
            mv ${sep=" " pheno} pheweb/generated-by-pheweb/pheno/ && \
            mv ${sep=" " manhattan} pheweb/generated-by-pheweb/manhattan/ && \
            cd pheweb && \
            pheweb phenolist glob generated-by-pheweb/pheno/* && \
            pheweb phenolist extract-phenocode-from-filepath --simple && \
            pheweb matrix && \
            pheweb top-hits && \
            pheweb gather-pvalues-for-each-gene
    }

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
        disks: "local-disk ${disk} ${disktype}"
        preemptible: 0
    }
}

workflow pheweb_import {

    File summaryfiles
    Array[String] phenofiles = read_lines(summaryfiles)
    String docker
    String disktype

    call annotation {
        input: docker=docker, disktype=disktype
    }

    scatter (phenofile in phenofiles) {
        call pheno {
            input: phenofile=phenofile, trie1=annotation.trie1, trie2=annotation.trie2, sites=annotation.sites, docker=docker, disktype=disktype
        }
    }

    call matrix {
        input: sites=annotation.sites, bed=annotation.bed, pheno=pheno.pheno, manhattan=pheno.manhattan, docker=docker, disktype=disktype
    }
}

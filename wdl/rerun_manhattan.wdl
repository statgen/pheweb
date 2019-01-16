
task create_manhattan {
    File result
    String outfile = basename(result) + ".json"
    String docker
    Int cpu
    Int mem
    Int disk

    command <<<
        python3 <<CODE
        from pheweb.load import manhattan
        manhattan.make_json_file("${result}", "${outfile}",write_as_given=True)
        CODE
    >>>

    output {
        File out="${outfile}"
    }

    runtime {
        docker: "${docker}"
    	cpu: "${cpu}"
    	memory: "${mem} GB"
        disks: "local-disk ${disk} SSD"
        preemptible: 0
    }
}

workflow manhattan {
    File augmented_results
    String docker
    Int cpu
    Int mem
    Int disk

    Array[String] phenofiles = read_lines(augmented_results)

    scatter( pheno in phenofiles) {
        call create_manhattan {
            input: result=pheno, docker=docker, cpu=cpu, mem=mem, disk=disk
        }
    }

}

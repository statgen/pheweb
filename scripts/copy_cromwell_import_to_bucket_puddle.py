#!/usr/bin/env python3

import argparse
import subprocess
import shlex
import json
import os
import time

output_nodes =["pheweb_import.matrix.matrix", "pheweb_import.matrix.matrix_tbi",
    "pheweb_import.matrix.pheno_gene","pheweb_import.matrix.phenolist",
    "pheweb_import.matrix.top_hits_1k","pheweb_import.matrix.top_hits_json","pheweb_import.matrix.top_hits_tsv",
    "pheweb_import.pheno.manhattan","pheweb_import.pheno.pheno_gz","pheweb_import.pheno.pheno_tbi",
    "pheweb_import.pheno.qq","pheweb_import.fix_json.json"]

annot_nodes = ["pheweb_import.annotation.bed", "pheweb_import.annotation.gene_trie",
    "pheweb_import.annotation.sites","pheweb_import.annotation.trie1","pheweb_import.annotation.trie2"]

def run():
    parser = argparse.ArgumentParser(description="Run x-way meta-analysis")
    parser.add_argument('cromwell_hash', action='store', type=str, help='Cromwell hash ')
    parser.add_argument('destination_bucket', action='store', type=str, help='Destination bucket to copy the files')

    parser.add_argument('--skip_annotation', action='store_true', help='Result file')

    parser.add_argument('--cromwell_url', default="localhost", action='store', type=str, help='Cromwell URL')
    parser.add_argument('--socks_proxy', default="localhost:5000", action='store', type=str, help='Cromwell URL')

    args = parser.parse_args()
    workflowID = args.cromwell_hash

    cw_url = args.cromwell_url
    dest_bucket = args.destination_bucket.rstrip("/")

    cmd1 = f'curl -X GET \"http://{cw_url}/api/workflows/v1/{workflowID}/metadata?includeKey=outputs\" -H \"accept: application/json\"'
    if args.socks_proxy != "":
        cmd1=f'{cmd1} --socks5 {args.socks_proxy}'

    pr = subprocess.run(shlex.split(cmd1), stdout=subprocess.PIPE, stderr=subprocess.PIPE,encoding="ASCII")
    if pr.returncode!=0:
            print(pr.stderr)
            raise Exception(f'Error occurred while requesting metadata. Did you remember to setup ssh tunnel? Use cromwellinteract.py connect servername')

    ret = json.loads( pr.stdout )

    print(args.skip_annotation)
    if "status" in ret and ret['status']=='fail' :
        raise Exception(f'Error requesting metadata. Cromwell message: {ret["message"]}')

    all_files = {}

    if not args.skip_annotation:
        output_nodes.extend(annot_nodes)

    for n in output_nodes:
        d = ret["outputs"][n] if not isinstance(ret["outputs"][n],str) else [ret["outputs"][n]]
        for f in d:
            bf = os.path.basename(f)
            outpath = f.split("/pheweb/")
            if (len(outpath)==1):
                outpath=[""]
            all_files[bf]=(f,f'{dest_bucket}/pheweb/{outpath[-1]}')


    print(f'Starting copying { len(all_files.keys())} file into {dest_bucket}...')
    processes = []
    for k,v in all_files.items():
        processes.append(subprocess.Popen(f'gsutil cp {v[0]} {v[1]}', shell=True))

    n_complete = 0
    while n_complete < len(processes):
        time.sleep(10)
        n_complete = 0
        for p in processes:
            p_poll = p.poll()
            if p_poll is not None and p_poll > 0:
                raise Exception('subprocess returned ' + str(p_poll))
            if p_poll == 0:
                n_complete = n_complete + 1
        print(f'{n_complete}/{len(processes)} copied')

    print("All files copied")


if __name__ == '__main__':
    run()

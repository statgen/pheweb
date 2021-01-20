#!/usr/bin/env python3

import argparse
import subprocess
import shlex
import json
import os
import time


def phef(f):
    return os.path.dirname(f'/{f.split("/pheweb/")[-1]}/')

output_nodes =[ ("pheweb_import.matrix.matrix",phef), ("pheweb_import.matrix.matrix_tbi",phef),
    ("pheweb_import.matrix.pheno_gene",phef),("pheweb_import.matrix.phenolist",phef),
    ("pheweb_import.matrix.top_hits_1k",phef),("pheweb_import.matrix.top_hits_json",phef),("pheweb_import.matrix.top_hits_tsv",phef),
    ("pheweb_import.pheno.manhattan",phef),("pheweb_import.pheno.pheno_gz",phef),("pheweb_import.pheno.pheno_tbi",phef),
    ("pheweb_import.pheno.qq",phef),("pheweb_import.fix_json.json",lambda x: f'/pheno-list.json') ]

annot_nodes = [ ("pheweb_import.annotation.bed",lambda x: f'/cache/'),
    ("pheweb_import.annotation.gene_trie",lambda x: f'/cache/'),("pheweb_import.annotation.sites",phef),
    ("pheweb_import.annotation.trie1",phef),("pheweb_import.annotation.trie2",phef)]

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

    if "status" in ret and ret['status']=='fail' :
        raise Exception(f'Error requesting metadata. Cromwell message: {ret["message"]}')

    all_files = {}

    if not args.skip_annotation:
        output_nodes.extend(annot_nodes)

    for n in output_nodes:
        d = ret["outputs"][n[0]] if not isinstance(ret["outputs"][n[0]],str) else [ret["outputs"][n[0]]]
        for f in d:
            bf = os.path.basename(f)
            outpath = n[1](f)
            print(f'copying {f} to {dest_bucket}{outpath} ')
            all_files[bf]=(f,f'{dest_bucket}{outpath}')

    print(f'Starting copying { len(all_files.keys())} file(s) into {dest_bucket}...')
    processes = []
    for k,v in all_files.items():
        processes.append(subprocess.Popen(f'gsutil cp {v[0]} {v[1]}', shell=True, stderr=subprocess.PIPE))

    n_complete = 0
    while n_complete < len(processes):
        time.sleep(5)
        n_complete = 0
        for p in processes:
            p_poll = p.poll()
            if p_poll is not None and p_poll > 0:
                outs, errs = p.communicate()
                raise Exception('subprocess returned ' + str(p_poll) + " " + (str(errs)))
            if p_poll == 0:
                n_complete = n_complete + 1
        print(f'{n_complete}/{len(processes)} copied')

    print("All files copied")


if __name__ == '__main__':
    run()

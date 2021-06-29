#!/usr/bin/env python3

import argparse
import subprocess
import shlex
import json
import os

from utils import progressBar,mapcount


def localize_files(gpath,file_list):
    """
    Get list of jsons to merge
    """
    with open(file_list,'wt') as f:
        if not gpath.endswith('/'): gpath += '/'
        gpath = (f"{gpath}**/*json")
        command = f"gsutil ls {gpath}"
        print(command)
        subprocess.call(shlex.split(command),stdout = f)
        
def merge_files(out_json,file_list):
    """
    Localizes each json as tmp file and reads it into memory
    """
    tmp_json = os.path.join(os.path.dirname(file_list),'tmp.json')
    json_list = []
    jsons = mapcount(file_list)
    
    with open(file_list) as i:
        for idx,line in enumerate(i):
            progressBar(idx,jsons)
            gfile = line.strip()
            command = f"gsutil cp {gfile} {tmp_json}"
            subprocess.call(shlex.split(command),stdout =subprocess.DEVNULL,stderr = subprocess.DEVNULL)

            with open(tmp_json) as f: j = json.load(f) 
            json_list.append(j)

    print('\ndone.')
    with open(out_json,'wt') as out:
        json.dump(json_list,out,indent = 2)

    os.remove(tmp_json)
    os.remove(file_list)
    
def run():
    parser = argparse.ArgumentParser(description="Merge jsons in one files")
    parser.add_argument('gpath', type=str, help='Gsutil path ')
    parser.add_argument('out_json',  type=str, help='Local path of final json')
    args = parser.parse_args()

    print(args)
    out_path = os.path.dirname(args.out_json)
    file_list = f"{os.path.join(out_path,'json_list.txt')}" 
    localize_files(args.gpath,file_list)
    merge_files(args.out_json,file_list)

    
if __name__ == "__main__":

    run()


from ..file_utils import common_filepaths
from ..conf_utils import conf
from ..serve.server_jeeves import ServerJeeves
from ..serve.encoder import FGJSONEncoder
#from flask.json import dump
from json import dump

import argparse
import numpy as np
import os
import time
from multiprocessing import Pool, Process
import multiprocessing
from concurrent import futures

import random
import threading
import traceback
from collections import defaultdict

def run(argv):
    parser = argparse.ArgumentParser(description="Export data of pheweb installation")
    parser.add_argument("outpath",
                        help="Output path",)
    parser.add_argument("--gene_report", action="store_true")
    parser.add_argument("--n_cpus", type=int, default=1)
    parser.add_argument("--force_write", action="store_true", help="by default does not compute data for files that already exists. Add this flag to always overwrite.")
    parser.add_argument("--bed_file", help="If given uses this bed file for gene report generation. Otherwise tries to use pheweb default")

    args = parser.parse_args(argv)

    if args.gene_report:
        export_gene_reports(args, args.outpath)

#/api/gene_phenos/[gene]
#/api/drugs/[gene]
#/api/lof/[gene]
#/api/gene_functional_variants/[gene]?p=0.0001


def export_gene_reports(args, outpath):
    
    print(common_filepaths["genes"])
    print("Exporting data for genes: {}".format(common_filepaths["genes"]))
    print(common_filepaths['genes'])

    if args.bed_file is not None:
        geneList = np.loadtxt(args.bed_file,dtype = str,usecols = (3,))
    else:
        geneList = np.loadtxt(common_filepaths['genes'],dtype = str,usecols = (3,))
    
    print("Generating data for : {} genes".format( len(geneList) ))

    ### split input for n_cpus processing.
    multiprocessing.set_start_method("spawn")
    processes = []
    chunksize = len(geneList) // args.n_cpus 
    for i in range(args.n_cpus):
        start_i = i*chunksize
        stop_i = start_i+chunksize 
        if i == args.n_cpus-1:
            stop_i = len(geneList)

        print("spawning process for {} {}".format(start_i, stop_i))
        p =Process(target=process_genes, args=( geneList[ start_i:stop_i], args, outpath) )
        p.start()
        processes.append(p)
    
    print("{} processes started for gene reports".format(args.n_cpus) )
    for p in processes:
        try:
            p.join()
        except:
            print("Process {} threw an error".format(p))
            traceback.print_stack()
        print("Process ended {}".format(p))
        
def process_genes(genes,args, outpath):

    process_log = open("{}/{}{}".format(outpath, os.getpid(), ".log" ),'wt' )
    print("Starting process {}".format(os.getpid()), file= process_log )
    genes_done=0 
    jeeves = ServerJeeves(conf)
    print("Created jeeves for process {}".format(os.getpid()), file= process_log )
    ten_start = time.time()
    for gene in genes:
        gene_f ="{}/{}_{}".format(outpath,gene,"_report_data.json")
        print("Processing gene {}".format(gene) )
        gene_start = time.time()
        if os.path.isfile(gene_f) and not args.force_write:
            print("Data exists for gene {}. Skipping..".format(gene), file= process_log )
            continue
        begin=time.time()
        start=time.time()
        try:
            func_vars = jeeves.gene_functional_variants(gene)
        except Exception as e:
            print("Error {}".format(e),  file=process_log)
            traceback.print_exc(file=process_log)
            continue
        print("get func vars for  took {}".format( time.time()-start), file=process_log )
        print("func vars {}".format(func_vars) )
        start=time.time()
        try:
            gene_phenos = jeeves.gene_phenos(gene)
            print("get gene phenos for {} took {}".format(gene, time.time()-start), file=process_log )
        except Exception as e:
            print("ERROR {}".format(e), file=process_log)
            traceback.print_exc(file=process_log)
            continue
        
        start=time.time()
        try:
            gene_lofs = jeeves.get_gene_lofs(gene)
        except Exception as e:
            print("Error {}".format(e), file=process_log)
            traceback.print_exc(file=process_log)
            continue
        print("get  gene lofs for {} took {}".format(gene, time.time()-start), file=process_log )
        
        start=time.time()
        try:
            gene_drugs = jeeves.get_gene_drugs(gene)
            print("get drugs for {} took {}".format(gene, time.time()-start), file=process_log )
        except Exception as e:
            print("Error {}".format(e), file=process_log)
            traceback.print_exc(file=process_log)
            continue
        genes_done = genes_done +1
        
        if genes_done % 10 == 0:
            print("{} genes done. Last 10 in {}".format(genes_done, time.time() - ten_start ), file=process_log )
            ten_start = time.time()


        print("Getting gene data for {} took {} seconds".format(gene, time.time()-begin), file=process_log)
        data = {"func_vars":func_vars, "gene_phenos":gene_phenos, "gene_lofs":gene_lofs, "gene_drugs":gene_drugs}
        with open(gene_f, 'wt') as f:
            dump(data, f, cls=FGJSONEncoder )



def go(gene, args, jeeves, outpath):
    print("threadid {} pid {}".format(threading.get_ident(), os.getpid() ))
    time.sleep(2)


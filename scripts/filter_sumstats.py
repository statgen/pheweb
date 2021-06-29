####
# Script that fixes sumstats for pheweb. Needs to replace header names and filter out unneeded columns

import os,importlib.util,gzip,sys,itertools,argparse
from utils import return_open_func,return_header,identify_separator,get_path_info,line_iterator,tmp_bash
from pathlib import Path

#IMPORT CONF UTIL FROM PHEWEB PATH
script_path = os.path.realpath(__file__)
pheweb_path = Path(script_path).parent.parent
spec = importlib.util.spec_from_file_location("module.name", os.path.join(pheweb_path,'pheweb','conf_utils.py'))
print(spec)
conf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conf)

variant_fields = conf.conf.parse.per_variant_fields
assoc_fields = conf.conf.parse.per_assoc_fields

def replace_header(sumstats,word_dict = {"#chrom":'chrom'} ):
    '''
    Function that given an input file it replaces all keys with values in the header
    '''

    open_func = return_open_func(sumstats)
    header = return_header(sumstats)
    sep = identify_separator(sumstats)


    # fix header
    for i,elem in enumerate(header):
        if elem in word_dict:
            header[i] = word_dict[elem]

    # return only columns needed
    to_be_kept = [header.index(elem) for elem in header if elem in variant_fields or elem in assoc_fields]
    new_header = [header[index] for index in to_be_kept]

    rej = [elem for elem in header if elem not in new_header]
    print(f"Extra columns found:{rej}")
    return new_header,to_be_kept


def edit_file(sumstats,header,columns,filter_na,test):
    '''
    Function that loops the original file, keeping only the required columns.
    It also filters out lines with NA values if required.
    '''
    path,basename,extension = get_path_info(sumstats)
    tmp_file = os.path.join(path,'tmp.gz')
    print(tmp_file)

    sep = identify_separator(sumstats)

    with gzip.open(tmp_file,'wt') as o:
        header = sep.join(header) + '\n'
        o.write(header)
        iterator = line_iterator(sumstats,columns = columns,skiprows=1)
        loop = itertools.islice(iterator,30) if test else iterator

        for line in loop:
            if 'NA' in line and filter_na:
                pass
            else:
                line = sep.join(line) + '\n'
                o.write(line)

    if 'mlogp' not in header:
        tmp2 = os.path.join(path,'tmp_mlog.gz')
        cmd = f"""zcat {tmp_file}  |awk 'BEGIN{{FS=OFS="\\t"}}  NR==1{{ for (i=1;i<=NF;i++) {{ h[$i]=i }};  print $0, "mlogp"}} NR>1{{  print $0, -log($h["pval"])/log(10) }}' | bgzip > {tmp2}"""
        tmp_bash(cmd)
        os.rename(tmp2,tmp_file)

    os.rename(tmp_file,sumstats)


def main(args):
    sep = identify_separator(args.word_dict)
    wd = {}
    with open(args.word_dict) as i:
        for line in i:
            key,val = line.strip().split(sep)
            wd[key] = val
    print(wd)

    header,columns = replace_header(args.sumstats,wd)
    print(header,columns)

    edit_file(args.sumstats,header,columns,args.filter_na,args.test)


if __name__=='__main__':

    parser=argparse.ArgumentParser(description="Filter sumstats to match pheweb")
    parser.add_argument('inputs', nargs=2)
    parser.add_argument('--filter-na',action='store_true',default = False)
    parser.add_argument('--test',action='store_true',default = False)
    args = parser.parse_args()
    print(args)

    args.sumstats,args.word_dict = args.inputs
    main(args)

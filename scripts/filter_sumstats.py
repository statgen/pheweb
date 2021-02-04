####
# Script that fixes sumstats for pheweb. Needs to replace header names and filter out unneeded columns

import os,importlib.util,gzip
from utils import return_open_func,return_header,identify_separator,get_path_info,line_iterator
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
    print(open_func,header,sep)
    

    # fix header 
    for i,elem in enumerate(header):
        if elem in word_dict:
            header[i] = word_dict[elem]

    # return only columns needed
    to_be_kept = [header.index(elem) for elem in header if elem in variant_fields or elem in assoc_fields]
    print(to_be_kept)
    
    return header,to_be_kept


def edit_file(sumstats,header,columns):

    path,basename,extension = get_path_info(sumstats)
    tmp_file = os.path.join(path,'tmp.gz')
    print(tmp_file)
 
    sep = identify_separator(sumstats)

    with gzip.open(tmp_file,'wt') as o:
        header = sep.join(header) + '\n'
        o.write(header)
        iterator = line_iterator(sumstats,columns = columns,skiprows=1)
        for line in iterator:
            line = sep.join(line) + '\n'
            o.write(line)
        
    os.rename(tmp_file,sumstats)

import sys
sumstats,word_dict = sys.argv[1],sys.argv[2]

sep = identify_separator(word_dict)
wd = {}
with open(word_dict) as i:
    for line in i:
        key,val = line.strip().split(sep)
        wd[key] = val
print(wd)

header,columns = replace_header(sumstats,wd)
print(header,columns)

edit_file(sumstats,header,columns)
        
            
    

    

    

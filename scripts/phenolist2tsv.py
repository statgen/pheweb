import json
import sys

phenos = json.load(open(sys.argv[1], 'rt'))
print('\t'.join(['phenocode','name','category','num_cases','num_controls','gc_lambda','num_gw_significant']))
for pheno in phenos:
    print('\t'.join([pheno['phenocode'], pheno['phenostring'], pheno['category'], str(pheno['num_cases']), str(pheno['num_controls']), str(pheno['gc_lambda']['0.5']), str(pheno['num_gw_significant'])]))

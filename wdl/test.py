DATA_DIR = '/mnt/disks/r6/test/pheweb/'
PHENO_JSON = DATA_DIR + "pheno-list.json"
CUSTOM_JSON = DATA_DIR + "custom.json"

import json,os

#extract pheno names
with open(PHENO_JSON) as f:phenolist = json.load(f)
# create json dict based on phenoname

with open(CUSTOM_JSON) as f:custom_json = json.load(f)
json_dict = {}
for elem in custom_json:
    json_dict[elem['name']] = elem
    


def find(name, path,subpath):
    for root, dirs, files in os.walk(path):
        if name in files and subpath in root:
            return os.path.join(root, name)

final_json = []
for p_dict in phenolist:
    print(p_dict)
    pheno = p_dict['phenocode']
    print(pheno)
    # FIND QQ PLOT
    p_qq = find(pheno +".json",DATA_DIR,'qq')
    with open(p_qq) as f: qq = json.load(f)
    # FIND MANAHTTAN PLOT 
    p_m = find(pheno +".json",DATA_DIR,'manhattan')
    with open(p_m) as f: manha = json.load(f)
    # FIND METADATA
    
    
    # UPDATE P_DICT
    p_dict['gc_lambda'] = qq['overall']['gc_lambda']
    p_dict['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])

    metadata = json_dict[pheno]
    with open(DATA_DIR + 'fields.txt') as i:fields = i.read().split()
    for key in fields: p_dict[key] = metadata[key]

    final_json.append(p_dict)
with open('./new_pheno.json', 'a') as outfile:
    json.dump(final_json, outfile, indent=2)
print(final_json)

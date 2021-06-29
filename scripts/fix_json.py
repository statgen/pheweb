DATA_DIR = '/mnt/disks/r6/test/pheweb/ukbb/fix/'
PHENO_JSON = '/mnt/disks/r6/test/pheweb/ukbb/fix/pheno-list.json'
CUSTOM_JSON = '/mnt/disks/r6/test/pheweb/ukbb/ukbb_json.txt'
print(DATA_DIR,PHENO_JSON)

import json,os
with open(PHENO_JSON) as f:phenolist = json.load(f)
with open(CUSTOM_JSON) as f: custom_jsons = {elem['name']:elem for elem in json.load(f)}
fields =  ["num_cases","num_controls","name","uk_file","description",'category']
print(fields)

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

    # UPDATE P_DICT
    p_dict['gc_lambda'] = qq['overall']['gc_lambda']
    p_dict['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])
    for key in fields: p_dict[key] = custom_jsons[pheno][key]

    final_json.append(p_dict)
    
with open('./new_pheno.json', 'a') as outfile: json.dump(final_json, outfile, indent=2)

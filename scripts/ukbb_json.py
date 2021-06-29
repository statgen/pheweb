import subprocess,shlex,json,os,pandas
from collections import defaultdict as dd
from utils import mapcount,progressBar

gpath = "gs://finngen-production-library-green/finngen_R6/finngen_R6_analysis_data/ukbb_meta/conf/"
pheno_description = 'gs://phewas-development/pheweb/pheno_info.txt'


def localize_files(gpath,file_list = './json_list.txt'):
    '''
    List of files to parse
    '''
    with open(file_list,'wt') as f:
        if not gpath.endswith('/'): gpath += '/'
        gpath = (f"{gpath}**/*json")
        command = f"gsutil ls {gpath}"
        print(command)
        subprocess.call(shlex.split(command),stdout = f)


def load_description():
    """
    Reads pandas dataframe with name(description) and category for FG phenos
    """
    description = "./description.txt"
    if not os.path.isfile(description):
        cmd = f"gsutil cp {pheno_description} {description}"
        subprocess.call(shlex.split(cmd))

    d = pandas.read_csv(description,delimiter='\t',encoding= 'unicode_escape',index_col = "phenocode").T 
    return d
        
def process_json(input_json,description_dict):
    """
    Creates a new json from old json and pheno metadata
    """

    #extract info from input json
    json_file =  input_json.split('/')[-1]
    pheno = json_file.split('.json')[0]

    # localize input json as tmp json
    tmp_json = './tmp/' + pheno + '.tmp.json'
    if not os.path.isfile(tmp_json):
        cmd =f'gsutil cp {input_json} {tmp_json}'
        subprocess.call(shlex.split(cmd))
    with open(tmp_json) as f: j = json.load(f)

    # get info from input json
    fg,uk = j['meta']
    cases = int(fg['n_cases'])+ int(uk['n_cases'])
    controls  =  int(fg['n_controls'])+ int(uk['n_controls'])
    uk_name = uk['file']

    # get info from fg metadata
    description,category = description_dict[pheno].values

    # create new json
    new_json = {'phenostring':description,'num_cases':cases,'num_controls':controls,'uk_file':uk_name,'name':pheno,'description':description,'category':category}
    
    out_json =  os.path.join('./json',json_file)
    with open(out_json,'wt') as out:
        json.dump(new_json,out)

    
def loop_json(file_list,description_dict):
    subprocess.call(shlex.split('mkdir -p json tmp'))

    files = mapcount(file_list)
    with open(file_list,'rt') as i:
        for idx,line in enumerate(i):
            progressBar(idx,files)
            line = line.strip()
            process_json(line,description_dict)
    print('\ndone.')
    
if __name__ == "__main__":
    file_list = './json_list.txt'
    localize_files(gpath,file_list)
    description_dict = load_description()
    loop_json(file_list,description_dict)

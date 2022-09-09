# Importing summary stats to pheweb

## Cromwell run

Import summary stats using [import.wdl](wdl/import.gwas_pipeline.wdl). Prepare a list of summary stats like in reference configuration file (one summary stat bucket path per line) [import.json](wdl/import.gwas_pipeline.json).

Also, you need to generate a custom json (`pheweb_import.fix_json.custom_json`) with additional information per sumstat (n_cases/n_controls, phenotype name, description). Example how to generate that json from R7 with the help of [create_custom_json.py](scripts/create_custom_json.py):

```sh
gsutil cp gs://finngen-production-library-green/finngen_R7/finngen_R7_analysis_data/finngen_R7_pheno_n.tsv .
python3 create_custom_json.py --phenotype_col phenocode --n_cases_col num_cases --n_controls_col num_controls --out_json R7_custom.json finngen_R7_pheno_n.tsv
```

***In case you need to update genes and their coordinates (used for gene page to gather best associations for each pheno and thus generally used as the set of gene names )***

Get bed file e.g. v38 gene annotations from gencode and upload to a bucket and change bed gene annotation to point to this file
```
curl https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gff3.gz | zcat |  awk ' BEGIN{FS=OFS="\t"} $3=="gene"{ gsub("chr","",$1); gsub("M","MT",$1); split($9,a,";"); for(e in a) { split(a[e],b,"=");elems[b[1]]=b[2] }; print $1,$4,$5,elems["gene_name"],elems["gene_id"]; }' > gencode.v38.genes.bed
```

***Copy imported data to destination***

After successful import run, copy generated file to a single bucket using proper file structure using [copy_cromwell_import_to_bucket_puddle.py](scripts/copy_cromwell_import_to_bucket_puddle.py). Parameters needed are cromwell hash and path to destination bucket:

```sh
copy_cromwell_import_to_bucket_puddle.py cromwell_hash gs://bucket_for_deployment_pickerupper/v8/
```

***You need to have a socks5 proxy open in localhost:5000 to cromwell machine to get the metadata.***

Example proxy creation if cromwell runs in google VM:

```sh
gcloud compute ssh cromwell-machine-name -- -D localhost:5000 -N
```

Alternatively if direct access available change url with `--cromwell_url yourURL` and remove proxy (--socks_proxy "")

## Cromwell run (meta-analysis results)

Use [import.ukbb.wdl](wdl/import.ukbb.wdl).

Use [import.ukbb.json](wdl/import.ukbb.json) as a config template. Most of the variables/files don't need to be changed, but two input files need to be generated:

1. `pheweb_import.summaryfiles`: list of meta-analysis result summary stats (one summary stat bucket path per line)
2. `pheweb_import.fix_json.custom_json`: file providing additional information per phenotype (n_cases/n_controls, phenotype name, description). Required fields are defined in the variable `"pheweb_import.fix_json.fields"`.

You can use scripts [ukbb_json.py](scripts/ukbb_json.py) and [merge_jsons.py](scripts/merge_jsons.py), or [create_custom_json.py](scripts/create_custom_json.py) to generate the custom json.

[create_custom_json.py](scripts/create_custom_json.py) requires a "mapping" file as input with columns describing phenotype name, description, category, and number of cases/controls per study.

Example of such mapping file:

```sh
(base) jmehton@lm0-945-22724 r7 % head FinnGen_pan-UKBB_EstBB_mapping.tsv | column -t -s $'\t'
name                                                  category                                                fg_phenotype                       ukbb_phenotype  estbb_phenotype  fg_n_cases  ukbb_n_cases  estbb_n_cases  fg_n_controls  ukbb_n_controls  estbb_n_controls
Malignant neoplasm of breast                          II Neoplasms, from cancer register (ICD-O-3)            C3_BREAST                          174.11          c03              13178       11807         1686           160568         205913           127984
Malignant neoplasm of prostate                        II Neoplasms, from cancer register (ICD-O-3)            C3_PROSTATE                        185             c04              10414       7691          1470           124994         169762           66507
Malignant neoplasm                                    II Neoplasms, from cancer register (ICD-O-3)            C3_CANCER                          204             c37              60459       65783         11047          248695         414840           180604
Leiomyoma of uterus (controls excluding all cancers)  II Neoplasms from hospital discharges (CD2_)            CD2_BENIGN_LEIOMYOMA_UTERI_EXALLC  218.1           c42              25716       11274         25244          122697         209602           94880
Hypothyroidism, strict autoimmune                     IV Endocrine, nutritional and metabolic diseases (E4_)  E4_HYTHY_AI_STRICT                 244             c05              33422       26966         11209          227415         370312           179726
Type1 diabetes, definitions combined                  Diabetes endpoints                                      T1D                                250.1           c06              3711        3250          293            255449         396181           173673
Proliferative diabetic retinopathy                    VII Diseases of the eye and adnexa (H7_)                H7_RETINOPATHYDIAB_PROLIF          250.7           c08              2025        1709          1961           284826         404535           197039
Polycystic ovarian syndrome                           IV Endocrine, nutritional and metabolic diseases (E4_)  E4_PCOS                            256.4           c09              994         245           4125           165817         224884           113030
Gout, strict definition                               Rheuma endpoints                                        GOUT_STRICT                        274.1           c32              3290        4509          2578           304399         415559           192600
```

To create the custom json from a mapping file with these columns and studies (fg, ukbb, est):

```sh
python3 create_custom_json.py --study_prefixes fg,ukbb,estbb --phenotype_col fg_phenotype FinnGen_pan-UKBB_EstBB_mapping.tsv
```

Also make sure the following are correct in the config (most likely you should not need to change these):

* `pheweb_import.pre_annot_sumfile` points to as broad as possible variant list (preferrably generated from the most recent FinnGen variant annotation file). The file needs to have columns `chrom`, `pos`, `ref` and `alt`.
* The key values in the dict defined in `pheweb_import.header_dict` are valid column names found from the sumstat files to be imported.

## Updating phenotype meta data in phenolist-json (R7 from Juha)

create UTF-8 TSV file from Aki's Excel, I've found this to be the best way to avoid double quotes around pheno names and correctly encode weird characters.
open Endpoints_Controls_FINNGEN_ENDPOINTS_DF7_Final_2021-03-05.xlsx in Excel and save as UTF-8 CSV
-install csvkit (terrible deps)

`csvformat -T Endpoints_Controls_FINNGEN_ENDPOINTS_DF7_Final_2021-03-05.csv > Endpoints_Controls_FINNGEN_ENDPOINTS_DF7_Final_2021-03-05.tsv`

in refinery get numbers of cases and controls from cov/pheno file:
E.g in R:
```
cov_pheno <- fread("gunzip -c /mnt/nfs/r7/R7_COV_PHENO_V2.FID.txt.gz")
first_pheno_index <- match("DEATH", names(cov_pheno))[1]
cs <- colSums(cov_pheno[,first_pheno_index:length(cov_pheno)], na.rm=T)
mcs <- colSums(1-cov_pheno[,first_pheno_index:length(cov_pheno)], na.rm=T)
fwrite(data.table(cbind(pheno=names(cs), cases=cs, ctrls=mcs, n_eff=2/(1/cs+1/mcs))), "n_eff.txt", quote=F, sep="\t")
```

in /mnt/nfs/pheweb/r7/phenolist
-copy Aki's files and the above created TSV and the above created n_eff.txt there
`gsutil cp gs://fg-cromwell_fresh/pheweb_import/e4792246-6efb-4b2e-a155-7f0dbbc00380/call-matrix/pheweb/pheno-list.json /mnt/nfs/pheweb/r7/pheno-list.json.orig`

`python3 phenolist.py /mnt/nfs/pheweb/r7/pheno-list.json.orig /mnt/nfs/pheweb/r6/pheno-list.json TAGLIST_DF7.txt Pheweb_FINNGEN
_ENDPOINTS_DF7_Final_2021-03-05.names_tagged_ordered.txt Endpoints_Controls_FINNGEN_ENDPOINTS_DF7_Final_2021-03-05.tsv n_eff.txt /mnt/nfs/
pheweb/r7/generated-by-pheweb | python -m json.tool > /mnt/nfs/pheweb/r7/pheno-list.json`

## Additional Datasets

### Setup
Setup environment

Configure gcloud sql instance.

`
export DB_INSTANCE=$(read -p "name of cloud instance" tmp; echo tmp) # name of cloud sql instance
gcloud sql instances describe ${DB_INSTANCE}                         # check definition
`

Configure database name, create database if necessary

`
export DB_NAME=$(read -p "name of database" tmp; echo tmp)          # database name
gcloud sql databases create ${DB_NAME} --instance=${DB_INSTANCE}    # create database if needed
gcloud sql databases describe ${DB_NAME} --instance=${DB_INSTANCE}  # check database name
`

Set the service account currently being used

`
# database service account
export SERVICE_ACCOUNT=$(gcloud sql instances describe ${DB_INSTANCE} | yq .serviceAccountEmailAddress)
`

Grant the service account access to your bucket root. This will be needed when data is imported
from the bucket to the database.

`
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:legacyBucketOwner ${BUCKET_ROOT}
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:legacyObjectReader ${BUCKET_ROOT}
`

Create tables from [https://github.com/FINNGEN/sql](https://github.com/FINNGEN/sql) create
the tables using the SQL scripts providied.

`
# create tables
(echo "USE ${DB_NAME}"; cat sql/*.sql) | gcloud sql connect ${DB_INSTANCE} --user ${CLOUD_SQL_USER}
`

Set the release identifier for your release.

`
export RELEASE=$(read -p "name pheweb release" tmp; echo tmp)
`

Set the pheweb root directory
`
export PHEWEB_ROOT=$(read -p "pheweb root" tmp; echo tmp)
`
### Import Data

Set you pipeline output identifier
`
export PIPELINE_OUTPUT_ROOT=$(read -p "pipeline output root" tmp; echo tmp)
export PIPELINE_OUTPUT_IDENTIFIER=$(read -p "pipeline output identifier" tmp; echo tmp)
`

The given an import idenitifier `${PIPELINE_OUTPUT_IDENTIFIER}` post pipeline
data as of r10 has the following layout.

```
#finemapping files : ${PIPELINE_OUTPUT_ROOT}/finemap/${PIPELINE_OUTPUT_IDENTIFIER}/finemap_cred_regions
gsutil ls ${PIPELINE_OUTPUT_ROOT}/finemap/${PIPELINE_OUTPUT_IDENTIFIER}/finemap_cred_regions/*.cred* > /dev/null 2> /dev/null && echo finemapping okay || echo finemapping failed

#this may change with future releases
#conditional sql :
gsutil ls ${PIPELINE_OUTPUT_ROOT}/conditional_analysis/cromwell-results/pheweb/*sql.merged.txt > /dev/null 2> /dev/null && echo finemapping okay || echo finemapping failed
gsutil ls ${PIPELINE_OUTPUT_ROOT}/conditional_analysis/cromwell-results/pheweb/munge/* > /dev/null 2> /dev/null && echo finemapping okay || echo finemapping failed
```

## Finemapping


Create data for finemapping sql tables

Copy files in the `finemap_cred_regions` directory to `${PHEWEB_ROOT}/cred`.  The files should be of
form *.cred? where the file names end in a numerical suffix :

e.g. PHENOTYPE.chr10.100-110.cred1

`
export FINEMAP_CRED=${PIPELINE_OUTPUT_ROOT}/finemap/${PIPELINE_OUTPUT_IDENTIFIER}/finemap_cred_regions
gsutil -m cp -R ${FINEMAP_CRED} ${PHEWEB_ROOT}/cred
`

Using [https://github.com/FINNGEN/sql](https://github.com/FINNGEN/sql)  run the following command.

`
export FINEMAPPING_SQL=${BUCKET_ROOT}/sql/finemap.sql.txt
python3 scripts/finemap_to_mysql.py ${RELEASE} ${PHEWEB_ROOT}/cred/ | gsutil cp - ${FINEMAPPING_SQL}
`

Import sql to the tables.

`
gcloud sql import csv ${DB_INSTANCE} ${FINEMAPPING_SQL} --quiet --database=${DB_NAME} --table=finemapped_regions --columns=rel,type,phenocode,chr,start,end,n_signals,n_signals_prob,variants,path
`

In the finemapping portion of pheweb configuration point the `finemap` property in the `base_paths` object to `${PHEWEB_ROOT}/cred`

e.g.
`
"base_paths": { "finemap": "${PHEWEB_ROOT}/cred" }
`

## Conditional



The path of the merged sql should be `conditional_analysis/cromwell-results/pheweb/*_sql.merged.txt`
Copy the merged sql to your bucket using the path ${CONDITIONAL_SQL}
`
export CONDITIONAL_SQL=${BUCKET_ROOT}/sql/conditional.sql.txt
gcloud sql import csv ${DB_INSTANCE} ${CONDITIONAL_SQL}  --quiet --database=analysis_r10 --table=finemapped_regions --columns=rel,type,phenocode,chr,start,end,n_signals,n_signals_prob,variants,path
`
Copy `conditional_analysis/cromwell-results/pheweb/munge` to `${PHEWEB_ROOT}/conditional`


In the finemapping portion of pheweb configuration point the `conditional` property in the `base_paths` object to `${PHEWEB_ROOT}/conditional`

## PIP

Local the pip files should be in finemap/pip/*.snp.filter.tsv
`
export PIP_PATH=
export PIP_SQL=${BUCKET_ROOT}/sql/pip.sql.txt
gsutil cat ${PIP_PATH}/*.snp.filter.tsv | grep --color=auto -v '^trait' | cut -f1,5,6,7,8,9 | tr '\t' ',' | sed s/chr//g |  gsutil cp - ${PIP_SQL}
`

# Deploying PheWeb in Google Cloud using Kubernetes

### 1. Install Docker, Google Cloud SDK, and kubectl

[Docker](https://docs.docker.com/install/)
[Google Cloud SDK](https://cloud.google.com/sdk/downloads)
[kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

Note that there can be at most one minor version difference between kubectl client and server versions: If the server is running v1.8, the client cannot be v1.10. Versions can be checked with `kubectl version`. If they differ too much, download a different version of the client or update the server.

### 2. Build a Docker image and push to Google Container Registry

In repository root:

`docker build -t gcr.io/phewas-development/pheweb:[TAG] -f deploy/Dockerfile .`
`gcloud docker -- push gcr.io/phewas-development/pheweb:[TAG]`

### 3. Setup the kubernetes cluster

Get credentials for a running cluster:
`gcloud container clusters get-credentials [CLUSTER-NAME] --zone=europe-west1-b`

Or create a new cluster:
`gcloud container clusters create [CLUSTER-NAME] --num-nodes=1 --machine-type=n1-standard-1 --zone=europe-west1-b`

Make sure you're in the right kubernetes context:

`kubectl config get-contexts`

If necessary:

`kubectl config use-context [CONTEXT-NAME]`

### 4. Apply kubernetes settings

This example is for R6 data. If using a running cluster:

In e.g. `deploy/pheweb-deployment-r6.yaml` (or other pheweb-deployment-* file), change the Docker image to the one you just created (or make other desired changes, note that `replicas` should usually be the same as the cluster size). Make sure that in `deploy/pheweb-pv-nfs.yaml`(or other pheweb-pv-* file) the NFS / GCE disk is the one you want with the wanted data - and that there is a correct config.py in the data directory of the disk. The data directory needs to be specified (`PHEWEB_DIR`) in `deploy/pheweb-deployment-r6.yaml`.

Then, apply the changes you made (example with dev config):

`kubectl apply -f deploy/pheweb-pv-nfs.yaml` (if changed) and/or
`kubectl apply -f deploy/pheweb-deployment-r6.yaml`

Or if using a new cluster:

Modify `deploy/pheweb-ingress-r6.yaml`, `deploy/pheweb-deployment-r6.yaml` and `deploy/pheweb-pv-nfs.yaml` -- or other files -- as needed. Then

`kubectl create -f deploy/pheweb-ingress-r6.yaml` and
`kubectl create -f deploy/pheweb-pv-nfs.yaml` and
`kubectl create -f deploy/pheweb-deployment-r6.yaml`

### 5. Update running StateFulSet

Example of updating the image used in StatefulSet
`kubectl patch statefulset pheweb-front --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/image", "value":"gcr.io/phewas-development/pheweb:r2-2"}]'`

Kubernetes will try to rolling update so that while some pods are updating, the others are serving using the old image.
In case the new image or settings are not functional Kubernetes will keep on retrying. In this case you need to update settings again first and then delete those pods that keep trying to run with the old settings.

`kubectl delete pod pheweb-front-3`

### 6. Total reset

In case of an incomprehensible situation and it would be great to bring the service back asap, here's how to do a full restart of the cluster (example with R2 and 4 nodes):

```
gcloud container clusters delete [CLUSTER_NAME]
gcloud container clusters create [CLUSTER_NAME] --num-nodes=4 --machine-type=n1-standard-1 --zone=europe-west1-b
kubectl create secret tls finngen-tls --key /path/to/star_finngen_fi.key --cert /path/to/star_finngen_fi.crt
kubectl create -f deploy/pheweb-ingress-r6.yaml
kubectl create -f deploy/pheweb-pv-nfs.yaml
kubectl create -f deploy/pheweb-deployment-r6.yaml
```

### 7. Useful commands

`kubectl get ingress`
`kubectl describe ingress`
`kubectl get svc`
`kubectl describe svc`
`kubectl get pods`
`kubectl logs [POD-NAME]`
`kubectl get events --sort-by=.metadata.creationTimestamp`

More [here](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)


# Adding external data to be shown together with FINNGEN phenotype results (UKBB)

## Prepare sumstats

Prepare external summary stat files for each phenotype (tabix indexed, same chr build as FinnGen results) and place them in NFS mount. Currently required column names are: ["achr38","apos38","REF","ALT","beta","pval"] the default after lifting over FinnGen data.

Create a manifest for all of the sumstats and what FinnGen phenotype each matches to. Required columns in this order (no header):
- NAME: matching FinnGen phenotype name (text)
- pheno description (free text)
- ncases: number of cases (numeric)
- ncontrols:  number of controls (numeric)
- file: full path to the tabixed summary stats.


## Create external matrix from all sumstats

Run[ external_matrix.py](pheweb/pheweb/load/external_matrix.py) in environment where you have access to the sumstats and config created in previous steps. Store the created matrix and .tbi in suitable location.

## Configure DAOs

Modify config.py and add to the following 2 elements in `data_base` json:

In DAO serving across all phenotypes `externalresultmatrix` set `matrix` to full path to the matrix created above and `metadatafile` to full path to the created metadata. The node name `ExternalMatrixResultDao` refers to the class implementing the DAO and is dynamically loaded. Don't change that string unless you provide custom implementation and create that class in [db.py](pheweb/pheweb/serve/data_access/db/py)

In DAO serving single results `externalresult` set `manifest` to full path to the created metadata file. The node name `ExternalFileResultDao` refers to the class implementing the DAO and is dynamically loaded. Don't change that string unless you provide custom implementation and create that class in [db.py](pheweb/pheweb/serve/data_access/db/py)

Example:
```
{
    "externalresultmatrix": {
        "ExternalMatrixResultDao": {"matrix":"/mnt/nfs/ukbb_neale/matrix.tsv.gz", "metadatafile":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}
    }
}, {
    "externalresult": {
        "ExternalFileResultDao": {"manifest":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}
    }
}
```


# PheWeb instructions

For an example, see the [Michigan Genomics Initiative PheWeb](http://pheweb.sph.umich.edu).
For a walk-through demo see [here](etc/demo.md#demo-navigating-pheweb).
If you have questions or comments, check out our [Google Group](https://groups.google.com/forum/#!forum/pheweb).

![screenshot of PheWAS plot](https://cloud.githubusercontent.com/assets/862089/25474725/3edbe256-2b02-11e7-8abb-0ca26d406b11.png)

# How to Build a PheWeb for your Data

If any of these steps is incorrect, please email me at <pjvh@umich.edu> and I'll see what I can do to improve things.

### 1. Install PheWeb

```bash
pip3 install pheweb
```

- If that doesn't work, follow [the detailed install instructions](etc/detailed-install-instructions.md#detailed-install-instructions).

### 2. Create a directory for your new dataset

1. `mkdir ~/my-new-pheweb && cd ~/my-new-pheweb`

   - This directory will store all data for the pheweb your are building. All `pheweb ...` commands should be run in this directory.
   - You can put it wherever you want and name it whatever you want.

2. If you want to configure any options, make a file `config.py` in your data directory. Some options you can set are:

   - Minor Allele Frequency cutoffs:
     - `assoc_min_maf`: an association (between a phenotype and variant) will only be included if its MAF is greater than this value.  (default: `0`, but it saves disk space during loading, so I usually use at least `variant_inclusion_maf / 2`)
     - `variant_inclusion_maf`: a variant will only be included if it has some associations with MAF greater than this value.  That is, if some or all associations for a variant are above `assoc_min_maf`, but none are above `variant_inclusion_maf`, that entire variant (including all of its associations with phenotypes) will be dropped.  If any association's MAF is above `variant_inclusion_maf`, all associations for that variant that are above `assoc_min_maf` will be included. (default: `0`, but I recommend at least `0.005`)

   - `cache`: a directory where files common to all datasets can be stored. If you don't want one, set `cache = False`. (default: `cache = "~/.pheweb/cache/"`)

### 3. Prepare your association files

You should have one file for each phenotype. It can be gzipped if you want. It should be **tab-delimited** and have a **header row**. Variants must be sorted by chromosome and position, with chromosomes in the order [1-22,X,Y,MT].

- If you are using EPACTS, your files should work just fine. If they don't, email me. EPACTS files won't have `REF` or `ALT`, but PheWeb will parse their `MARKER_ID` column to get those.

The file must have columns for:

| column description | name | other allowed column names | allowed values |
| --- | --- | --- | --- |
| chromosome | `chrom` | `#chrom` | integer 1-22, `X`, `Y`, `M`, `MT` |
| position | `pos` | `beg`, `begin` | integer | a |
| reference allele | `ref` | | anything |
| alternate allele | `alt` | | anything |
| p-value | `pval` | `pvalue` | number in [0,1] |

_Note: column names are case-insensitive._

_Note: any field may be `.` or `NA`.  For required fields, these values will cause the variant to be dropped._

_Note: if your column name is not one of these, you may set `field_aliases = {"column_name": "field_name"}` in `config.py`.  For example, `field_aliases = {'P_BOLT_LMM_INF': 'pval'}`._

_Note: scientific notation is okay._

You may also have columns for:

| column description | name | allowed column names | allowed values |
| --- | --- | --- | --- |
| minor allele frequency | `maf` | | number in (0,0.5] |
| allele frequency | `af` | | number in (0,1) |
| allele count | `ac` | | integer |
| effect size | `beta` | | number |
| standard error of effect size | `sebeta` | | number |
| odds ratio | `or` | | number |
| R2 | `r2` | | number |
| number of samples | `num_samples` | `ns`, `n` | integer, must be the same for every variant in its phenotype |
| number of controls | `num_controls` | `ns.ctrl`, `n_controls` | integer, must be the same for every variant in its phenotype |
| number of cases | `num_cases` | `ns.case`, `n_cases` | integer, must be the same for every variant in its phenotype |


### 4. Make a list of your phenotypes

Inside of your data directory, you need a file named `pheno-list.json` that looks like this:

```json
[
 {
  "assoc_files": ["/home/watman/ear-length.epacts.gz"],
  "phenocode": "ear-length"
 },
 {
  "assoc_files": ["/home/watman/eats-kimchi.X.epacts.gz","/home/watman/eats-kimchi.autosomal.epacts.gz"],
  "phenocode": "eats-kimchi"
 }
]
```

`phenocode` must only contain letters, numbers, or any of `_-~`.

That example file only includes the columns `assoc_files` (a list of paths to association files) and `phenocode` (a string representing your phenotype that is valid in a URL). If you want, you can also include:

- `phenostring`: a string that is more descriptive than `phenocode` and will be shown in several places
- `category`: a string that will group together phenotypes in the PheWAS plot and also be shown in several places
- `num_cases`, `num_controls`, and/or `num_samples`: numbers of strings which will be shown in several places
- anything else you want, but you'll have to modify templates to show it.

There are four ways to make a `pheno-list.json`:

1. If you have a csv (or tsv, optionally gzipped) with a header that has EXACTLY the right column names, just import it by running `pheweb phenolist import-phenolist "/path/to/my/pheno-list.csv"`.

   If you have multiple association files for each phenotype, you may put them all into a single column with `|` between them. For example, your file `pheno-list.csv` might look like this:

   ```
   phenocode,assoc_files
   eats-kimchi,/home/watman/eats-kimchi.autosomal.epacts.gz|/home/watman/eats-kimchi.X.epacts.gz
   ear-length,/home/watman/ear-length.all.epacts.gz
   ```

2. If you have one association file per phenotype, you can use a shell-glob and a regex to get assoc-files and phenocodes for them. Suppose that your assocation files are at paths like:

   - `/home/watman/eats-kimchi.epacts.gz`
   - `/home/watman/ear-length.epacts.gz`

   Then you could run `pheweb phenolist glob-files "/home/watman/*.epacts.gz"` to get `assoc-files`.

   To get `phenocodes`, you can use a regex that captures the phenocode from the file path. In most cases (including this one), just use:

   ```
   pheweb phenolist extract-phenocode-from-filepath --simple
   ```

3. If you have multiple association files for some phenotypes, you can follow the directions in 2 and then run `pheweb phenolist unique-phenocode`.

   For example, if your association files are at:

   - `/home/watman/autosomal/eats-kimchi.epacts.gz`
   - `/home/watman/X/eats-kimchi.epacts.gz`
   - `/home/watman/all/ear-length.epacts.gz`

   then you can run:

   ```
   pheweb phenolist glob-files "/home/watman/*/*.epacts.gz"
   pheweb phenolist extract-phenocode-from-filepath --simple
   pheweb phenolist unique-phenocode
   ```

4. If you want to do more advanced things, like merging in more information from another file, email <pjvh@umich.edu> and I'll write documentation for `pheweb phenolist`.

   No matter what you do, please run `pheweb phenolist verify` when you are done to check that it worked correctly. At any point, you may run `pheweb phenolist view` or `pheweb phenolist print-as-csv` to view the current file.

### 5. Load your association files

1. Run `pheweb process`.

   - This step can take hours or days for large datasets.  If you want to use the SLURM cluster scheduler, run `pheweb slurm-parse` for parsing and then `pheweb process --no-parse` for everything else.

2. If something breaks, read the error message.

   - If you can understand the error message, modify your association or config files to avoid it, or drop the problematic phenotypes from `pheno-list.json`.  Then re-run `pheweb process`.
   - If the problem is something that PheWeb should support by default, feel free to email it to me at <pjvh@umich.edu>.
   - If you can't understand the error message, please email your error message to <pjvh@umich.edu> and hopefully I can get back to you quickly.

### 6. Serve the website

Run `pheweb serve --open`.

That command should either open a browser to your new PheWeb, or it should give you a URL that you can open in your browser to access your new PheWeb.
If it doesn't, follow the directions for [hosting a PheWeb and accessing it from your browser](etc/detailed-webserver-instructions.md#hosting-a-pheweb-and-accessing-it-from-your-browser).

To use Apache2 or Nginx (for performance), see instructions [here](etc/detailed-webserver-instructions.md#using-apache2-or-nginx).
To require login via OAuth, see instructions [here](etc/detailed-webserver-instructions.md#using-oauth).
To track page views with Google Analytics, see instructions [here](etc/detailed-webserver-instructions.md#using-google-analytics).

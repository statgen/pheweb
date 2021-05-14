#!/bin/bash -x
set -e

export PHEWEB_ROOT=`pwd`
export PYTHONPATH=`pwd`:$PYTHONPATH
cd /mnt/nfs_dev/pheweb/metaextension
[ -d "generated-by-pheweb" ] && rm -rf generated-by-pheweb
FILE=Z21_PRESENCE_OTH_DEVICES_meta_out
mkdir -p generated-by-pheweb/{pheno,parsed,sites,manhattan,qq}
cp /mnt/nfs_dev/pheweb/r6/generated-by-pheweb/sites/sites.tsv generated-by-pheweb/sites/sites.tsv
gsutil cat gs://finngen-production-library-green/finngen_R6/finngen_R6_analysis_data/ukbb_meta/$FILE.tsv.gz | zcat | awk -F"\t" '{ if($20 != "NA") { print }}' | head -n 100000 > generated-by-pheweb/parsed/$FILE
echo generated-by-pheweb/parsed/$FILE | awk '{print $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1}' > generated-by-pheweb/pheno_config.txt
pheweb map-fields --rename '#CHR:chrom,POS:pos,REF:ref,ALT:alt,SNP:snp,all_inv_var_meta_p:pval,all_inv_var_meta_beta:beta,all_inv_var_meta_
sebeta:sebeta' generated-by-pheweb/parsed/$FILE

python3 $PHEWEB_ROOT/pheweb/load/external_matrix.py \
       generated-by-pheweb/pheno_config.txt \
       generated-by-pheweb/ \
       /mnt/nfs_dev/pheweb/r6_test/generated-by-pheweb/sites/sites.tsv.noheader \
       --chr chrom --pos pos --ref ref --alt alt \
       --all_fields \
       --no_require_match \
       --no_tabix 

bgzip generated-by-pheweb/matrix.tsv
tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/matrix.tsv.gz
pheweb phenolist glob ./generated-by-pheweb/parsed/*
pheweb phenolist extract-phenocode-from-filepath --simple
pheweb augment-phenos
pheweb manhattan

pheweb sites
pheweb make-gene-aliases-trie
pheweb add-rsids
pheweb add-genes
pheweb make-tries

mv generated-by-pheweb/parsed/$FILE \
   generated-by-pheweb/pheno/$FILE
pheweb qq

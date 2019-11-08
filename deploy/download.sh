#!/usr/bin/env bash

#workflow="b6b5d3e7-2ed8-473c-ab40-f6e248cccc72"
workflow="bc1f6e2b-78ad-4f89-bd83-72144ccb6939"

mkdir -p generated-by-pheweb/pheno_gz generated-by-pheweb/manhattan generated-by-pheweb/sites generated-by-pheweb/qq generated-by-pheweb/cache

gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-matrix/**/pheno-list.json pheno-list.json.orig
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-annotation/**/sites/* generated-by-pheweb/sites/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-annotation/**/gene* generated-by-pheweb/cache/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-pheno/**/*.gz* generated-by-pheweb/pheno_gz/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-pheno/**/manhattan/* generated-by-pheweb/manhattan/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-pheno/**/qq/* generated-by-pheweb/qq/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-matrix/**/top* generated-by-pheweb/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-matrix/**/best* generated-by-pheweb/
gsutil -mq cp gs://fg-cromwell/pheweb_import/${workflow}/call-matrix/**/matrix.tsv.gz* generated-by-pheweb/

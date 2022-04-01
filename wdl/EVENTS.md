# r9
## import development

    *Import*

	*Configuration*
    34 demonstration phenotypes

    See r9.development.import.json
	*Artifacts*
    cromwell hash:
    7cd620ed-45ce-4b8c-b8dd-5b08e2b6d0c8

### Issues during import

    The WDL was not the current import.wdl, and there were issues related to generating gene pa


## import production

    *Import*

	*Configuration*
    2275 endpoints, including 2269 binary endpoints and 6 quantitative endpoints. 3 of these quantitative endpoints ( HEIGHT, WEIGHT, BMI) were not intended as core analysis endpoints.

    See r9.production.import.json

	*Artifacts*
	cromwell hash : 062a640a-9d6a-46f6-a734-536d95b4c4dd
    data: gs://r9_data_green/production/

### Issues when running import
    *Incident*
    in annotation task, `pheweb make-gene-aliases-sqlite3` failed due to a file download failing. Rerunning the task solved the problem.
    cromwell hash: 728b30cd-84e4-482c-a60b-c6b7a29623e2
    failed workflow log: gs://dev-cromwell-1/import_pheweb/728b30cd-84e4-482c-a60b-c6b7a29623e2/call-annotation/annotation.log

    *Solution*
    Transient error -> rerun did not encounter it.

    *Incident*
    Copying of files to GCS failed for annotation task.
    Error message: ServiceException: 401 Anonymous caller does not have storage.objects.list access to the Google Cloud Storage bucket.
    cromwell hash:857bcca2-224c-4cf9-b1bd-b45d4f3c41f3

    *Solution*
    Disabling of file copying  and subsequent manual copying to GCS.

## empty best phenos by gene

	*Incident*

	The bed file contained an entry with 'M' as a chromsome.
	The causes best-phenos-by-gene to fail writing out an
	empty json object.

	The bed script was updated to filter out 'M' chromsomes.

```
curl https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_38/gencode.v38.annotation.gff3.gz | \
zcat | \
awk ' BEGIN{FS=OFS="\t"} $3=="gene"{ gsub("chr","",$1); gsub("M","MT",$1); split($9,a,";"); for(e in a) { split(a[e],b,"=");elems[b[1]]=b[2] }; print $1,$4,$5,elems["gene_name"],elems["gene_id"]; }' | \
gsutil cp - gs://r9_data_green/genes-without-M-b38-v39.bed
```

	*Configuration*
    r9-best-phenos-by-gene.wdl
	r9-best-phenos-by-gene.json

	*Artifacts*
    cromwell hash : f17c4611-8849-4816-ae33-dc4def15b8e3
	gs://r9_data_green/genes-without-M-b38-v39.bed

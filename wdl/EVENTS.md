# r9
## import development

    *Import*

	*Configuration*

	*Artifacts*


## import production

    *Import*

	*Configuration*

	*Artifacts*
	cromwell hash : f13ffb9c-caef-4ed1-b364-a28083daf181

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

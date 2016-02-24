#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import
import psycopg2
import csv
import json
import sys

epacts_filename_template = '/net/dumbo/home/larsf/PheWAS/MATCHED/PheWAS_{}_MATCHED.epacts'

# phenos
with open('/net/dumbo/home/larsf/PheWAS/PheWAS_code_v1_2.txt') as f:
    phenos = {pheno['phewas_code2']: pheno for pheno in csv.DictReader(f, delimiter='\t')}

with open('postgres_password') as f:
    postgres_password = f.read()
with psycopg2.connect(dbname="postgres", user="pheweb_writer", password=postgres_password, host="localhost") as conn:
    with conn.cursor() as curs:

        curs.execute("SELECT chrom, pos, ref, alt, id FROM pheweb.variants")
        # MARKER_ID -> variant.id
        variant_ids = {'{chrom}:{start}_{ref}/{alt}_{chrom}:{end}'.format(chrom=v[0], start=v[1], ref=v[2], alt=v[3], end=v[1]+len(v[2])-1): v[4] for v in curs}

        curs.execute("SELECT phewas_code, id FROM pheweb.phenos")
        # phewas_code -> pheno.id
        pheno_ids = {p[0]: p[1] for p in curs}

        for pheno in phenos.itervalues():
            print(pheno['phewas_code2'], '-', pheno['category_string'], '-', pheno['phewas_string'], file=sys.stderr)
            pheno_id = pheno_ids[pheno['phewas_code2']]

            # insert all associations for this pheno
            with open(epacts_filename_template.format(pheno['NR'])) as f:
                for v in csv.DictReader(f, delimiter='\t'):
                    if v['PVALUE'] != 'NA':
                        variant_id = variant_ids[v['MARKER_ID']]

                        print(variant_id,
                              pheno_id,
                              v['BETA'],
                              v['SEBETA'],
                              v['MAF'],
                              v['PVALUE'],
                          )

# -*- coding: utf-8 -*-
import abc
import attr
import copy
from importlib import import_module
from collections import defaultdict
from elasticsearch import Elasticsearch
import json
import pysam
import re
import math
import threading
import pandas as pd
import numpy as np
import pymysql
import imp
from typing import List, Tuple, Dict, Union
from ...file_utils import MatrixReader, common_filepaths
from ...utils import get_phenolist, get_gene_tuples, pvalue_to_mlogp, get_use_phenocode_pheno_map

from collections import namedtuple
import requests
import importlib
import gzip
import subprocess
import time
import io
import os
import subprocess
import sys
import glob
from pheweb_colocalization.model_db import ColocalizationDAO
from .variant_phenotype_pip import  VariantPhenotypePipDao
from ..components.chip.fs_storage import FileChipDAO
from ..components.coding.fs_storage import FileCodingDAO
from pathlib import Path
from .drug_db import DrugDB, DrugDao
from ..components.autocomplete.tries_dao import AutocompleterTriesDAO
from ..components.autocomplete.sqlite_dao import AutocompleterSqliteDAO
from ..components.autocomplete.mysql_dao import AutocompleterMYSQLDAO




class JSONifiable(object):
    @abc.abstractmethod
    def json_rep(self):
        """
        Return an object that can be jsonencoded.
        """


class Variant(JSONifiable):
    def __init__(self, chr, pos, ref, alt):
        try:
            self.chr = int(chr)
        except:
            raise Exception("Chromosome can be only numeric! Use x=23, y=24 and MT=25")

        self.pos = int(pos)
        self.ref = ref
        self.alt = alt
        self.varid = "{}:{}:{}:{}".format(self.chr, self.pos, self.ref, self.alt)
        self.annotation = {}

    def add_annotation(self, name, value):
        self.annotation[name] = value

    @property
    def id(self):
        return self.varid

    @property
    def rsids(self):
        if "rsids" in self.annotation:
            return self.annotation["rsids"]
        else:
            return None

    @rsids.setter
    def rsids(self, value):
        self.annotation["rsids"] = value

    def get_annotation(self, name):
        if name in self.annotation:
            return self.annotation[name]
        else:
            return None

    def get_annotations(self):
        return self.annotation

    def merge_annot(self, other, overwrite=True):
        """
        Merges annotations from another Variant object. overwrite determines if annotation with the same name is overwritten or kept
        """
        for k, v in other.get_annotations():
            if k not in self.annotation or overwrite:
                self.add_annotation(k, v)

    def __eq__(self, other):
        return (
            self.chr == other.chr
            and self.pos == other.pos
            and self.ref == other.ref
            and self.alt == other.alt
        )

    def __hash__(self):
        return hash(self.varid)

    def __repr__(self):
        return self.varid

    def json_rep(self):
        return self.__dict__


def optional_float(x):
    if x is None:
        return None
    elif x == 'NA':
        return None
    elif x == '':
        return None
    else:
        return float(x)

class PhenoResult(JSONifiable):
    def __init__(
        self,
        phenocode,
        phenostring,
        category_name,
        category_index,
        pval,
        beta,
        maf,
        maf_case,
        maf_control,
        n_case,
        n_control,
        mlogp,
        n_sample=None,
        pip=None
    ):
        self.phenocode = phenocode
        self.phenostring = phenostring
        self.pval = float(pval) if pval is not None and pval != "NA" else None
        self.pval = (
            sys.float_info.min * sys.float_info.epsilon if self.pval == 0 else self.pval
        )
        self.beta = float(beta) if beta is not None and beta != "NA" else None
        self.maf = optional_float(maf)
        self.maf_case = optional_float(maf_case)
        self.maf_control = optional_float(maf_control)
        self.matching_results = {}
        self.category = category_name
        self.category_index = category_index
        self.n_case = n_case
        self.n_control = n_control
        if pip is not None:
            self.pip = pip
        if n_sample is None:
            self.n_sample = n_case + n_control
        else:
            self.n_sample = n_sample
        self.mlogp = float(mlogp) if mlogp is not None and mlogp != "NA" else None
        # issue #126 : use log10 p-values
        # handle the case where mlogp is missing
        if self.mlogp is None:
            # if pval is missing there is nothing we can do
            if self.pval is None:
                None
            else:
                self.mlogp = pvalue_to_mlogp(self.pval)

    def add_matching_result(self, resultname, result):
        self.matching_results[resultname] = result

    def get_matching_result(self, resultname):
        return (
            self.matching_results[resultname]
            if resultname in self.matching_results
            else None
        )

    def set_pip(self, pip : float):
        if pip is not None:
            self.pip = pip

    def json_rep(self):
        return self.__dict__


@attr.s
class PhenoResults(JSONifiable):
    pheno = attr.ib(attr.validators.instance_of(Dict))
    assoc = attr.ib(attr.validators.instance_of(PhenoResult))
    variant = attr.ib(attr.validators.instance_of(List))

    def json_rep(self):
        return self.__dict__


class GeneInfoDB(object):
    @abc.abstractmethod
    def get_gene_info(self, symbol):
        """Retrieve gene basic info given gene symbol.
        Args: symbol gene symbol
        Returns: dictionary with elements 'description': short desc, 'summary':extended summary, 'maploc':chrmaplos   'start': startpb 'stop': stopbp
        """
        return


class ExternalResultDB(object):
    @abc.abstractmethod
    def get_matching_results(
        self, phenotype: str, var_list: List[Variant]
    ) -> Dict[Variant, Dict]:
        """Given a phenotype name and variant list returns a list of matching results.
        Args: phenotype phenotype names
              var_list list of Variant objects
            returns dictionary keyd by Variant and values are dictionary or result elements
        """
        return

    @abc.abstractmethod
    def get_results_region(self, phenotype, chr, start, stop):
        """Given a phenotype name and coordinates returns all results .
        Args: phenotype phenotype names
              var_list var_list list of tuples with CHR POS:int REF ALT
            returns list of namedtuples with elements effect_size, pvalue, study_name, n_cases, n_controls
        """
        return

    @abc.abstractmethod
    def getNs(self, phenotype):
        """Given a phenotype name returns tuple with ncases,nconrols. .
        Args: phenotype phenotype names
        returns tuple with ncase and ncontrols
        """
        return

    @abc.abstractmethod
    def get_multiphenoresults(
        self, varphenodict: Dict[Variant, List[str]], known_range=None
    ) -> Dict[Variant, Dict[str, Dict]]:
        """Given a dictionary with Variant as keys  and list of phenocodes as values returns corresponding geno pheno results.
        This interface allows implementations to optimize queries if multiple phenotype results for same variant are co-located
        known_range: tuple of 3 elements (chr,start,end) giving contiguous region in chromosome to restrict the search to e.g. improve performance by reading one contiguous region.
        Implementations are free to ignore this parameter

        returns dictionary of dictionaries first keyed by variant and then by phenocode
        """


class AnnotationDB(object):
    @abc.abstractmethod
    def get_variant_annotations(self, variants: List[Variant], cpra) -> List[Variant]:
        """Retrieve variant annotations given a list of Variants.
        Returns a list of Variant objects with new annotations with id 'annot' and with all annotations that existed in the search Variant
        """
        return

    @abc.abstractmethod
    def get_variant_annotations_range(self, chrom, start, end):
        """Retrieve variant annotations given a range.
        Returns a list of Variant objects with new annotations with id 'annot'
        """
        return

    @abc.abstractmethod
    def get_single_variant_annotations(self, variant: Variant, cpra) -> Variant:
        """
        Retrieve variant annotations for a single variant. Returns a variant with annotations in id 'annot'  and including all old annotations
        """

    @abc.abstractmethod
    def get_gene_functional_variant_annotations(self, gene):
        """Retrieve annotations of functional variants for a given gene.
        Args: gene gene symbol
        Returns: A list of dictionaries. Dictionary has 2 elements:
                 "id" - variant id chrN:pos:ref:alt
                 "var_data" - a dictionary with variant annotations
        """
        return


class GnomadDB(object):
    @abc.abstractmethod
    def get_variant_annotations(self, id_list):
        """Retrieve variant annotations given variant id list.
        Args: id_list list of string in format chr:pos:ref:alt
        Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the query id and "var_data" containing dictionary with all variant data.
        """
        return

    @abc.abstractmethod
    def get_variant_annotations_range(self, chrom, start, end):
        """Retrieve variant annotations given a range.
        Returns a list of Variant objects with new annotations with id 'gnomad'
        """
        return


class LofDB(object):
    @abc.abstractmethod
    def get_all_lofs(self, p_threshold):
        """Retrieve all loss of function burden test results
        Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the gene id and "gene_data" containing dictionary with all gene data.
        """
        return

    @abc.abstractmethod
    def get_lofs(self, gene):
        """Retrieve all loss of function burden test results for a given gene
        Returns: A list of dictionaries. Dictionary has 2 elements "id" which contains the gene id and "gene_data" containing dictionary with all gene data.
        """
        return


class AutorepVariantDB(object):
    @abc.abstractmethod
    def get_group_variants(self, phenotype, locus_id):
        """Retrieve a given locuses variants for a given phenotype
        Returns: A list of dictionaries. WIP
        """
        return

    @abc.abstractmethod
    def get_group_report(self, phenotype):
        """Retrieve a given phenotype's group report
        Returns: A list of dictionaries, with the group report columns as dictionary keys and every dictionary representing a row.
        """


class KnownHitsDB(object):
    @abc.abstractmethod
    def get_hits_by_loc(self, chr, start, stop):
        """Retrieve known hits in GWAS catalog and UKBB for a region
        Args: chr
              start
              stop
        Returns: A list of dictionaries. Dictionary has x elements: "pheno" which contains a phenotype dict, and "assoc" containing a variant dict ("pval", "id", "rsids"). The list is sorted by p-value.
        """


class ResultDB(object):
    @abc.abstractmethod
    def get_variant_results_range(
        self, chrom, start, end
    ) -> List[Tuple[Variant, List[PhenoResult]]]:
        """Return associations of all phenotypes in given range
        Returns a list of variants and results in chromosomal order. Each element contains tuple of 2 elements: Variant object and a list of PhenoResult objects
        """
        return

    @abc.abstractmethod
    def get_top_per_pheno_variant_results_range(
        self, chrom, start, end
    ) -> List[PhenoResults]:
        """Retrieves top variant for each phenotype in a given range
        Returns: A list of PhenoResults "pheno" which contains a phenotype dict, and "assoc" containing PhenoResult object, 'variant' contains Variant object. The list is sorted by p-value.
        """
        return

    def get_variants_results(
        self, variants: List[Variant]
    ) -> List[Tuple[Variant, List[PhenoResult]]]:
        """
        Returns all results and annotations for given variant list. Returns empty list if no results found
        """

    def get_single_variant_results(
        self, variant: Variant
    ) -> Tuple[Variant, List[PhenoResult]]:
        """
        Returns all results and annotations for given variant. Returns tuple of Variant (including updated annotations if any) and phenotype results.
        Returns None if variant does not exist.
        """


class CodingDB(object):
    @abc.abstractmethod
    def get_coding(self):
        """Retrieve coding variant data
        Returns: coding variant results and annotation
        """
        return


class ChipDB(object):
    @abc.abstractmethod
    def get_chip(self):
        """Retrieve chip GWAS results
        Returns: chip GWAS results and annotation
        """
        return


class FineMappingDB(object):
    @abc.abstractmethod
    def get_regions(self, variant: Variant):
        """Retrieve conditional/fine-mapped regions based on variant position
        Returns: (empty) list of regions
        """
        return

    @abc.abstractmethod
    def get_max_region(self, phenocode, chr, start, end):
        """Retrieve the maximum conditional/fine-mapped region overlapping the given range
        Returns: a {'start': pos, 'end': pos} dict
        """
        return

    @abc.abstractmethod
    def get_regions_for_pheno(
        self, type, phenocode, chr, start, end, get_most_probable_finemap_n=True
    ):
        """Retrieve conditional/fine-mapped regions for a phenotype overlapping the given range
        type can be 'all', 'conditional' or 'finemapping'
        Returns: list of regions
        """
        return


class MichinganGWASUKBBCatalogDao(KnownHitsDB):

    build38ids = "1,4"

    def get_hits_by_loc(self, chr, start, stop):

        r = requests.get(
            "https://portaldev.sph.umich.edu/api/v1/annotation/gwascatalog/results/?format=objects&filter=id in "
            + MichinganGWASUKBBCatalogDao.build38ids
            + " and chrom eq  '"
            + str(chr)
            + "'"
            + " and pos ge "
            + str(start)
            + " and pos le "
            + str(stop)
        )
        text = r.text
        encoded_string = text.encode("ascii", errors="ignore")
        decode_string = encoded_string.decode()
        # remove escaped unicode
        normalize_string = re.sub("\\\\u\d+", "", decode_string)
        rep = json.loads(normalize_string)
        return rep["data"]


class NCBIGeneInfoDao(GeneInfoDB):
    def __init__(self):
        pass

    def get_gene_info(self, symbol):
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term="
            + symbol
            + "[gene])%20AND%20(Homo%20sapiens[orgn])%20AND%20alive[prop]%20NOT%20newentry[gene]&sort=weight&retmode=json"
        )

        ret = r.json()["esearchresult"]
        if "ERROR" in ret:
            raise Exception(
                "Error querying NCBI. Error:" + ret["esearchresult"]["ERROR"]
            )
        if ret["count"] == 0:
            raise Exception("Gene: " + symbol + " not found in NCBI db")
        id = ret["idlist"][0]
        r = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id="
            + id
            + "&retmode=json"
        )
        rep = r.json()
        if "result" not in rep:
            raise Exception("Could not access NCBI gene summary. Response:" + str(rep))
        data = rep["result"][id]
        ## chr stop seems to be missing from top level annotation
        loc = list(
            filter(lambda x: x["annotationrelease"] == "109", data["locationhist"])
        )[0]
        return {
            "description": data["description"],
            "summary": data["summary"],
            "start": data["chrstart"],
            "stop": loc["chrstop"],
            "maploc": data["maplocation"],
        }


class ElasticAnnotationDao(AnnotationDB):
    def __init__(self, host, port, variant_index):

        self.index = variant_index
        self.host = host
        self.port = port

        self.elastic = Elasticsearch(host + ":" + str(port))
        if not self.elastic.ping():
            raise ValueError(
                "Could not connect to elasticsearch at " + host + ":" + str(port)
            )

        if not self.elastic.indices.exists(index=variant_index):
            raise ValueError("Elasticsearch index does not exist:" + variant_index)

    def get_variant_annotations(self, variant_list):
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": False,
                "stored_fields": "*",
                "query": {
                    "constant_score": {
                        "filter": {"terms": {"_id": [v.id for v in variant_list]}}
                    }
                },
            },
        )

        print(
            "ELASTIC FINNGEN get_variant_annotations hits "
            + str(annotation["hits"]["total"])
        )
        print("ELASTIC FINNGEN get_variant_annotations took " + str(annotation["took"]))
        return [
            {
                "id": anno["_id"],
                "var_data": {k: v[0] for (k, v) in anno["fields"].items()},
            }
            for anno in annotation["hits"]["hits"]
        ]

    def get_gene_functional_variant_annotations(self, gene):
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields": "*",
                "query": {
                    "bool": {
                        "filter": [
                            {"term": {"gene": gene}},
                            {
                                "bool": {
                                    "should": [
                                        {"term": {"most_severe": "missense_variant"}},
                                        {"term": {"most_severe": "frameshift_variant"}},
                                        {
                                            "term": {
                                                "most_severe": "splice_donor_variant"
                                            }
                                        },
                                        {"term": {"most_severe": "stop_gained"}},
                                        {
                                            "term": {
                                                "most_severe": "splice_acceptor_variant"
                                            }
                                        },
                                        {"term": {"most_severe": "start_lost"}},
                                        {"term": {"most_severe": "stop_lost"}},
                                        {"term": {"most_severe": "TFBS_ablation"}},
                                        {
                                            "term": {
                                                "most_severe": "protein_altering_variant"
                                            }
                                        },
                                    ]
                                }
                            },
                        ]
                    }
                },
            },
        )

        # maf annotation is not correct - get af from _source
        for anno in annotation["hits"]["hits"]:
            anno["fields"]["af"] = [anno["_source"]["af"]]

        print(
            "ELASTIC FINNGEN get_gene_functional_variant_annotations hits "
            + str(annotation["hits"]["total"])
        )
        print(
            "ELASTIC FINNGEN get_gene_functional_variant_annotations took "
            + str(annotation["took"])
        )

        return [
            {
                "id": anno["_id"],
                "var_data": {k: v[0] for (k, v) in anno["fields"].items()},
            }
            for anno in annotation["hits"]["hits"]
        ]


class ElasticGnomadDao(GnomadDB):
    def __init__(self, host, port, variant_index):

        self.index = variant_index
        self.host = host
        self.port = port

        url = f"{host}:{port}"
        self.elastic = Elasticsearch(host + ":" + str(port))
        if not self.elastic.ping():
            raise ValueError(
                "Could not connect to elasticsearch at " + host + ":" + str(port)
            )

        if not self.elastic.indices.exists(index=variant_index):
            raise ValueError("Elasticsearch index does not exist:" + variant_index)

    def _variant_id_to_gnomad_id(self, id):
        return id.replace("chr", "").replace(":", "-")

    def get_variant_annotations(self, id_list):
        gnomad_ids = [self._variant_id_to_gnomad_id(id) for id in id_list]
        annotation = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields": "*",
                "query": {
                    "constant_score": {
                        "filter": {"terms": {"genomes_variantId": gnomad_ids}}
                    }
                },
            },
        )
        print(
            "ELASTIC GNOMAD get_variant_annotations hits "
            + str(annotation["hits"]["total"])
        )
        print("ELASTIC GNOMAD get_variant_annotations took " + str(annotation["took"]))
        return [
            {
                "id": anno["_source"]["genomes_variantId"],
                "var_data": {
                    k: v
                    for (k, v) in anno["_source"].items()
                    if re.match("genomes_AF_[A-Z]{3}", k) or k == "genomes_POPMAX"
                },
            }
            for anno in annotation["hits"]["hits"]
        ]


class TabixGnomadDao(GnomadDB):
    def __init__(self, matrix_path):
        self.matrix_path = matrix_path
        tabix_file = pysam.TabixFile(self.matrix_path, parser=None)
        self.headers = tabix_file.header[0].split("\t")


    def get_variant_annotations(self, var_list):
        annotations = []
        t = time.time()
        ##print("There are {} active tabix handles for gnomad".format( len(self.tabix_handles)))
        tabix = pysam.TabixFile(self.matrix_path, parser=None)
        for var_i, variant in enumerate(var_list):
            # print("There are {} active tabix handles for gnomad. Current pid {}".format( len(self.tabix_handles), os.getpid()))

            ### TODO get rid of this chr shit once the annotation files have been fixed
            fetch_chr = (
                str(variant.chr)
                .replace("23", "X")
                .replace("24", "Y")
                .replace("25", "Y")
            )

            tabix_iter = tabix.fetch(
               fetch_chr, variant.pos - 1, variant.pos)

            for row in tabix_iter:
                split = row.split("\t")
                if split[3] == variant.ref and split[4] == variant.alt:
                    for i, s in enumerate(split):
                        if (
                            self.headers[i].startswith("AF")
                            and split[i] != "NaN"
                            and split[i] != "."
                        ):
                            split[i] = float(s)
                    annotations.append(
                        {
                            "variant": variant,
                            "var_data": {
                                self.headers[i]: split[i] for i in range(0, len(split))
                            },
                        }
                    )
                else:
                    # print(split[3] + ' - ' + variant['ref'] + ' / ' + split[4] + ' - ' + variant['alt'])
                    pass

        print(
            "TABIX GNOMAD get_variant_annotations "
            + str(round(10 * (time.time() - t)) / 10)
        )
        return annotations

    def get_variant_annotations_range(self, chrom, start, end):
        # gnomAD annotation still has X and not 23
        chrom = "X" if str(chrom) == "23" else chrom
        try:
            tabix_iter = pysam.TabixFile(self.matrix_path).fetch(chrom, start - 1, end)
        except ValueError:
            print(
                "No variants in the given range. {}:{}-{}".format(chrom, start - 1, end)
            )
            return []

        annotations = []
        for row in tabix_iter:
            split = row.split("\t")
            split[0] = split[0].replace("X", "23")
            v = Variant(split[0], split[1], split[3], split[4])
            v.add_annotation(
                "gnomad", {self.headers[i]: split[i] for i in range(0, len(split))}
            )
            annotations.append(v)

        return annotations

def extend_pheno_result(pr : PhenoResult,
                        record_offset : int,
                        field_offsets,
                        row):
    for key, offset in field_offsets.items():
        if not hasattr(pr, key):
            setattr(pr, key, row[record_offset+offset])
    return pr

class TabixResultDao(ResultDB):
    def __init__(self, phenos, matrix_path):

        self.matrix_path = matrix_path
        self.pheno_map = phenos(0)


        self.header = gzip.open(self.matrix_path,'rt').readline().split("\t")
        self.phenos = [
            (h.split("@")[1], p_col_idx)
            for p_col_idx, h in enumerate(self.header)
            if h.startswith("pval")
        ]
        self.header_offset = {}
        i = 0
        for h in self.header:
            s = h.split("@")
            if "@" in h:
                if p is not None and s[1] != p:
                    break
                self.header_offset[s[0]] = i
                i = i + 1
            p = s[1] if len(s) > 1 else None


    def get_variant_results_range(self, chrom, start, end):
        try:
            tabix_iter = pysam.TabixFile(self.matrix_path, parser=None).fetch(
                chrom, start - 1, end)
        except ValueError:
            print(
                "No variants in the given range. {}:{}-{}".format(chrom, start - 1, end)
            )
            return []

        result = []
        for variant_row in tabix_iter:
            split = variant_row.split("\t")
            chrom = (
                split[0]
                .replace("chr", "")
                .replace("X", "23")
                .replace("Y", "24")
                .replace("MT", "25")
            )
            v = Variant(chrom, split[1], split[2], split[3])
            if split[4] is not "":
                v.rsids = split[4]
            v.add_annotation("nearest_gene", split[5])
            phenores = []
            for pheno in self.phenos:

                pval = split[pheno[1]]
                beta = split[pheno[1] + self.header_offset["beta"]]
                maf = (
                    split[pheno[1] + self.header_offset["maf"]]
                    if "maf" in self.header_offset
                    else None
                )
                maf = (
                    split[pheno[1] + self.header_offset["af_alt"]]
                    if "af_alt" in self.header_offset
                    else maf
                )
                maf_case = (
                    split[pheno[1] + self.header_offset["maf_cases"]]
                    if "maf_cases" in self.header_offset
                    else None
                )
                maf_case = (
                    split[pheno[1] + self.header_offset["af_alt_cases"]]
                    if "af_alt_cases" in self.header_offset
                    else maf_case
                )
                maf_control = (
                    split[pheno[1] + self.header_offset["maf_controls"]]
                    if "maf_controls" in self.header_offset
                    else None
                )
                mlogp = (
                    split[pheno[1] + self.header_offset["mlogp"]]
                    if "mlogp" in self.header_offset
                    else None
                )
                maf_control = (
                    split[pheno[1] + self.header_offset["af_alt_controls"]]
                    if "af_alt_controls" in self.header_offset
                    else maf_control
                )
                if pval is not None and not pval == "" and not pval == "NA":
                    pr = PhenoResult(
                        pheno[0],
                        self.pheno_map[pheno[0]]["phenostring"],
                        self.pheno_map[pheno[0]]["category"],
                        self.pheno_map[pheno[0]]["category_index"]
                        if "category_index" in self.pheno_map[pheno[0]]
                        else None,
                        pval,
                        beta,
                        maf,
                        maf_case,
                        maf_control,
                        self.pheno_map[pheno[0]]["num_cases"]
                        if "num_cases" in self.pheno_map[pheno[0]]
                        else 0,
                        self.pheno_map[pheno[0]]["num_controls"]
                        if "num_controls" in self.pheno_map[pheno[0]]
                        else 0,
                        mlogp,
                        self.pheno_map[pheno[0]]["num_samples"]
                        if "num_samples" in self.pheno_map[pheno[0]]
                        else "NA",
                    )
                    pr = extend_pheno_result(pr,pheno[1],self.header_offset,split)
                    pr = phenores.append(pr)
            result.append((v, phenores))
        return result

    def get_single_variant_results(
        self, variant: Variant
    ) -> Tuple[Variant, PhenoResult]:

        res = self.get_variants_results([variant])
        for r in res:
            if r[0] == variant:
                return r
        return None

    def get_variants_results(
        self, variants: List[Variant]
    ) -> List[Tuple[Variant, PhenoResult]]:
        if type(variants) is not list:
            variants = [variants]
        results = []
        for v in variants:
            res = self.get_variant_results_range(v.chr, v.pos, v.pos)
            for r in res:
                if r[0] == v:
                    results.append(r)
        return results

    def get_top_per_pheno_variant_results_range(self, chrom, start, end):
        chrom = "23" if chrom == "X" else chrom
        try:
            tabix_iter = pysam.TabixFile(self.matrix_path, parser=None).fetch(
                chrom, start - 1, end
            )

        except ValueError:
            print(
                "No variants in the given range. {}:{}-{}".format(chrom, start - 1, end)
            )
            return []
        top = defaultdict(lambda: defaultdict(dict))

        n_vars = 0
        for variant_row in tabix_iter:
            n_vars = n_vars + 1
            split = variant_row.split("\t")
            for pheno in self.phenos:
                pval = split[pheno[1]]
                beta = split[pheno[1] + self.header_offset["beta"]]
                maf = (
                    split[pheno[1] + self.header_offset["maf"]]
                    if "maf" in self.header_offset
                    else None
                )
                maf = (
                    split[pheno[1] + self.header_offset["af_alt"]]
                    if "af_alt" in self.header_offset
                    else maf
                )
                maf_case = (
                    split[pheno[1] + self.header_offset["maf_cases"]]
                    if "maf_cases" in self.header_offset
                    else None
                )
                maf_case = (
                    split[pheno[1] + self.header_offset["af_alt_cases"]]
                    if "af_alt_cases" in self.header_offset
                    else maf_case
                )
                mlogp = (
                    split[pheno[1] + self.header_offset["mlogp"]]
                    if "mlogp" in self.header_offset
                    else None
                )
                maf_control = (
                    split[pheno[1] + self.header_offset["maf_controls"]]
                    if "maf_controls" in self.header_offset
                    else None
                )
                maf_control = (
                    split[pheno[1] + self.header_offset["af_alt_controls"]]
                    if "af_alt_controls" in self.header_offset
                    else maf_control
                )
                # Pick the smaller of values.  First try using mlog which
                # maybe absent in earlier releases.  In this case fall back
                # to using pval to order.
                if mlogp is not None and mlogp is not "" and mlogp != "NA":
                    # have mlogp compare mlog
                    is_less_than = (
                        pheno[0] not in top or (float(mlogp)) > top[pheno[0]][1].mlogp
                    )
                else:
                    # we don't have mlogp use pval
                    is_less_than = (
                        pval is not ""
                        and pval != "NA"
                        and (
                            pheno[0] not in top or (float(pval)) < top[pheno[0]][1].pval
                        )
                    )
                if is_less_than:
                    pr = PhenoResult(
                        pheno[0],
                        self.pheno_map[pheno[0]]["phenostring"],
                        self.pheno_map[pheno[0]]["category"],
                        self.pheno_map[pheno[0]]["category_index"]
                        if "category_index" in self.pheno_map[pheno[0]]
                        else None,
                        pval,
                        beta,
                        maf,
                        maf_case,
                        maf_control,
                        self.pheno_map[pheno[0]]["num_cases"]
                        if "num_cases" in self.pheno_map[pheno[0]]
                        else 0,
                        self.pheno_map[pheno[0]]["num_controls"]
                        if "num_controls" in self.pheno_map[pheno[0]]
                        else 0,
                        mlogp,
                        self.pheno_map[pheno[0]]["num_samples"]
                        if "num_samples" in self.pheno_map[pheno[0]]
                        else "NA",
                    )
                    v = Variant(
                        split[0].replace("X", "23"), split[1], split[2], split[3]
                    )
                    if split[4] != "":
                        v.add_annotation("rsids", split[4])
                    v.add_annotation("nearest_gene", split[5])
                    top[pheno[0]] = (v, pr)

        print(str(n_vars) + " variants iterated")
        top = [
            PhenoResults(pheno=self.pheno_map[pheno], assoc=dat, variant=v)
            for pheno, (v, dat) in top.items()
        ]
        # A hack to handle missing mlogp
        # as sort is stable it should return
        # with the the pval order.
        top.sort(key=lambda pheno: pheno.assoc.pval)
        top.sort(key=lambda pheno: pheno.assoc.mlogp, reverse=True)

        return top


class ExternalMatrixResultDao(ExternalResultDB):
    def __init__(self, matrix, metadatafile):
        self.matrix = matrix
        self.metadatafile = metadatafile
        self.meta = {}

        self.res_indices = defaultdict(lambda: {})

        with open(self.metadatafile, "r") as meta:
            header = meta.readline().rstrip("\n").split("\t")
            req_headers = ["NAME", "ncases", "ncontrols"]
            if not all([h in header for h in req_headers]):
                raise Exception(
                    "External result meta-data must be tab separated and must have columns: "
                    + ",".join(req_headers)
                )

            name_idx = header.index("NAME")
            ncase_idx = header.index("ncases")
            ncontrol_idx = header.index("ncontrols")

            for p in meta:
                p = p.rstrip("\n").split("\t")
                self.meta[p[name_idx]] = {
                    "ncases": p[ncase_idx],
                    "ncontrols": p[ncontrol_idx],
                }


        with gzip.open(self.matrix, "rt") as res:
            header = res.readline().rstrip("\n").split("\t")
            comp_header = ["#chr", "pos", "ref", "alt"]
            if not all([comp_header[i] == header[i] for i in [0, 1, 2, 3]]):
                raise Exception(
                    "External result data must be tab separated and must begin with columns: "
                    + ",".join(req_headers)
                    + " followed by individual result fields"
                )

            for i, field in enumerate(header[4:]):
                elem, pheno = field.split("@")
                self.res_indices[pheno][elem] = i + 4

    def __get_restab(self):
        if self.tabixfile is None:
            self.tabixfile = pysam.TabixFile(self.matrix, parser=None)

        return self.tabixfile

    def getNs(self, phenotype):

        res = None
        if phenotype in self.meta:
            m = self.meta[phenotype]
            res = (m["ncases"], m["ncontrol"])

        return res

    def get_matching_results(self, phenotype, var_list):
        ##TODO: refactor all variant lists everywhere to use Variant objects
        res = {}
        if type(var_list) is not list:
            var_list = [var_list]

        if phenotype in self.res_indices:
            manifestdata = self.res_indices[phenotype]
            per_variant = []
            tabix = pysam.TabixFile(self.matrix, parser=None)
            for var in var_list:
                t = time.time()

                try:
                    iter = tabix.fetch(
                        var.chrom, var.pos - 1, var.pos
                    )
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        ext_v = Variant(ext_var[0], ext_var[1], ext_var[2], ext_var[3])
                        if ext_v == var:
                            datapoints = {
                                elem: ext_var[i] for elem, i in manifestdata.items()
                            }
                            datapoints.update(
                                {
                                    "var": ext_v,
                                    "n_cases": self.meta[phenotype]["ncases"],
                                    "n_controls": self.meta[phenotype]["ncontrol"],
                                }
                            )
                            res[var] = datapoints

                except ValueError as e:
                    print("Could not tabix variant. " + str(e))
        return res

    def get_multiphenoresults(self, varphenodict, known_range=None):
        """
        varphenodict: dictionary keyed by Variant and values are a list of phenocodes to look for
        known_range: only searches this range for matching variants. This speeds up the query if it is known that all variants reside close to each other in a contiguous block of results
        returns dictionary of dictionaries first keyed by Variant and then by phenocode
        """

        res = defaultdict(lambda: defaultdict(lambda: dict()))
        t = time.time()

        if known_range is not None:

            iter = pysam.TabixFile(self.matrix, parser=None).fetch(
                "chr" + known_range[0], known_range[1] - 1, known_range[2]
            )

            for ext_var in iter:
                ext_var = ext_var.split("\t")
                ## TODO remove all chr from annotation files and remove this replace so that error will be thrown if wrong chr type is attemptent
                chrom = (
                    ext_var[0]
                    .replace("chr", "")
                    .replace("X", "23")
                    .replace("Y", "24")
                    .replace("MT", "25")
                )
                var = Variant(chrom, ext_var[1], ext_var[2], ext_var[3])
                if var in varphenodict:
                    phenos = varphenodict[var]
                    for p in phenos:
                        if p not in self.res_indices:
                            continue
                        manifestdata = self.res_indices[p]
                        datapoints = {
                            elem: ext_var[i] for elem, i in manifestdata.items()
                        }
                        datapoints.update(
                            {
                                "chr": ext_var[0],
                                "varid": var.id,
                                "pos": ext_var[1],
                                "ref": ext_var[2],
                                "alt": ext_var[3],
                                "n_cases": self.meta[p]["ncases"],
                                "n_controls": self.meta[p]["ncontrols"],
                            }
                        )
                        res[var][p] = datapoints
        else:
            tabix = pysam.TabixFile(self.matrix, parser=None)
            for var, phenos in varphenodict.items():
                try:
                    ## todo remove CHR when annotations fixed
                    iter = tabix.fetch(
                        "chr" + str(var.chr), var.pos - 1, var.pos,
                    )

                    #iter = self.tabixfiles[threading.get_ident()].fetch(
                    #    "chr" + str(var.chr), var.pos - 1, var.pos,
                    #)
                    for ext_var in iter:
                        ext_var = ext_var.split("\t")
                        chrom = (
                            ext_var[0]
                            .replace("chr", "")
                            .replace("X", "23")
                            .replace("Y", "24")
                            .replace("MT", "25")
                        )
                        ext_v = Variant(chrom, ext_var[1], ext_var[2], ext_var[3])
                        if var == ext_v:
                            for p in phenos:
                                if p not in self.res_indices:
                                    continue
                                manifestdata = self.res_indices[p]
                                datapoints = {
                                    elem: ext_var[i] for elem, i in manifestdata.items()
                                }
                                datapoints.update(
                                    {
                                        "var": var,
                                        "n_cases": self.meta[p]["ncases"],
                                        "n_controls": self.meta[p]["ncontrols"],
                                    }
                                )
                                res[var][p] = datapoints

                except ValueError as e:
                    print("Could not tabix variant. " + str(e))
        print("TABIX GET MULTIPHENORESULTS TOOK {} seconds".format(time.time() - t))
        return res


class ExternalFileResultDao(ExternalResultDB):
    FILE_REQ_HEADERS = ["achr38", "apos38", "REF", "ALT", "beta", "pval"]
    ResRecord = namedtuple(
        "ResRecord",
        "name, ncases, ncontrols, file, achr38_idx, apos38_idx, REF_idx, ALT_idx, beta_idx, pval_idx",
    )
    VarRecord = namedtuple(
        "VarRecord",
        "origvariant,variant,chr,pos,ref,alt,beta, pval, study_name, n_cases, n_controls",
    )

    def __init__(self, manifest):

        self.manifest = manifest
        self.results = {}

        if manifest is None:
            ## initialize with none and never returns any results
            return

        with open(self.manifest, "r") as mani:
            header = mani.readline().rstrip("\n").split("\t")

            req_headers = ["NAME", "ncases", "ncontrols", "file"]
            if not all([h in header for h in req_headers]):
                raise Exception(
                    "External result file must be tab separated and must have columns: "
                    + ",".join(req_headers)
                )

            name_idx = header.index("NAME")
            ncase_idx = header.index("ncases")
            ncontrol_idx = header.index("ncontrols")
            file_idx = header.index("file")

            for line in mani:
                line = line.rstrip("\n").split("\t")
                filename = line[file_idx]

                fopen = open
                if filename.endswith(".gz"):
                    fopen = gzip.open

                with fopen(line[file_idx], "rt") as f:
                    header = f.readline().rstrip("\n").split("\t")

                    if not all([h in header for h in self.FILE_REQ_HEADERS]):
                        raise Exception(
                            "All required headers not found in external result file:"
                            + line[file_idx]
                            + ". Required fields: "
                            + ",".join(self.FILE_REQ_HEADERS)
                        )

                    self.results[line[name_idx]] = ExternalFileResultDao.ResRecord(
                        line[name_idx],
                        line[ncase_idx],
                        line[ncontrol_idx],
                        line[file_idx],
                        header.index("achr38"),
                        header.index("apos38"),
                        header.index("REF"),
                        header.index("ALT"),
                        header.index("beta"),
                        header.index("pval"),
                    )

    def get_results_region(self, phenotype, chr, start, stop):

        res = []
        if phenotype in self.results:
            manifestdata = self.results[phenotype]
            tabf = pysam.TabixFile(manifestdata.file, parser=None)
            tabix_iter = tabf.fetch("chr" + chrom, start - 1, stop)
            for var in tabix_iter:
                var = var.split("\t")
                varid = [
                    var[manifestdata.achr38_idx],
                    var[manifestdata.apos38_idx],
                    var[manifestdata.REF_idx],
                    var[manifestdata.ALT_idx],
                ].join(":")
                res.append(
                    {
                        "varid": varid,
                        "chr": var[manifestdata.achr38_idx],
                        "pos": var[manifestdata.apos38_idx],
                        "ref": var[manifestdata.REF_idx],
                        "alt": var[manifestdata.ALT_idx],
                        "beta": var[manifestdata.beta_idx],
                        "pval": var[manifestdata.pval_idx],
                        "n_cases": manifestdata.ncases,
                        "n_controls": manifestdata.ncontrols,
                    }
                )

        return res

    def get_matching_results(self, phenotype, var_list):
        res = {}

        allt = time.time()

        if type(var_list) is not list:
            var_list = [var_list]

        if phenotype in self.results:
            manifestdata = self.results[phenotype]
            tabf = pysam.TabixFile(manifestdata.file, parser=None)
            for var in var_list:
                ## here we are running tabix for multiple files and storing all Tabix objects would consume too much memory.
                ## Running external tabix commands is way too slow!

                ### TODO: remove the chr once the datafiles have been regenerated
                fetch_chr = (
                    ("chr" + str(var.chr))
                    .replace("23", "X")
                    .replace("24", "Y")
                    .replace("25", "MT")
                )
                iterator = tabf.fetch(fetch_chr, var.pos - 1, var.pos)
                for ext_var in iterator:
                    ext_split = ext_var.split("\t")
                    ### TODO: remove this once the datafiles have been regenerated

                    chrom = (
                        ext_split[manifestdata.achr38_idx]
                        .replace("chr", "")
                        .replace("X", "23")
                        .replace("Y", "24")
                        .replace("MT", "25")
                    )
                    ext_var = Variant(
                        chrom,
                        ext_split[manifestdata.apos38_idx],
                        ext_split[manifestdata.REF_idx],
                        ext_split[manifestdata.ALT_idx],
                    )
                    if ext_var == var:
                        res[var] = {
                            "var": var,
                            "beta": ext_split[manifestdata.beta_idx],
                            "pval": ext_split[manifestdata.pval_idx],
                            "n_cases": manifestdata.ncases,
                            "n_controls": manifestdata.ncontrols,
                        }
            tabf.close()
        return res

    def get_multiphenoresults(
        self, varphenodict, known_range=None
    ):  # known_range not used but defined in abstract
        res = defaultdict(lambda: defaultdict(lambda: dict()))
        for var, phenolist in varphenodict.items():
            for p in phenolist:
                r = self.get_matching_results(p, [var])
                if len(r) > 0:
                    res[var][p] = r
        return res

    def getNs(self, phenotype):
        if phenotype in self.results:
            manifest = self.results[phenotype]
            return (manifest.ncases, manifest.ncontrols)
        else:
            return None


class ConfigurationException(Exception):
    def __init__(self, *p, **kw):
        super().__init__(*p, *kw)


class TabixAnnotationDao(AnnotationDB):

    ACCEPT_MISSING = {"nan": 1, "none": 1, "": 1, "na": 1}

    # float gets special treatment to nan so it automatically works in json/javascript. Nobody knows my sorrow...
    DATA_CONVS = {
        "uint32": lambda x: None
        if x.lower() in TabixAnnotationDao.ACCEPT_MISSING
        else int(x),
        "float": lambda x: float("nan")
        if x.lower() in TabixAnnotationDao.ACCEPT_MISSING
        else float(x),
        "bool": lambda x: None
        if x.lower() in TabixAnnotationDao.ACCEPT_MISSING
        else bool(x),
        "string": lambda x: x,
    }

    def __init__(self, matrix_path, gene_column="gene"):
        self.gene_column = gene_column
        self.matrix_path = matrix_path
        self.gene_region_mapping = {
            genename: (chrom, pos1, pos2)
            for chrom, pos1, pos2, genename in get_gene_tuples()
        }
        self.tabix_file = pysam.TabixFile(self.matrix_path, parser=None)
        self.headers = [s for s in self.tabix_file.header[0].split("\t")]

        self.header_i = {header: i for i, header in enumerate(self.headers)}

        self.n_calls = 0
        self.functional_variants = set(
            [
                "missense_variant",
                "frameshift_variant",
                "splice_donor_variant",
                "stop_gained",
                "splice_acceptor_variant",
                "start_lost",
                "stop_lost",
                "TFBS_ablation",
                "protein_altering_variant",
            ]
        )

        datatypesf = Path(self.matrix_path + ".datatypes")

        def f(x):
            return x

        self.dconv = defaultdict(lambda: f)

        print("Checking if type config exists {}".format(datatypesf))
        if datatypesf.is_file():
            print(
                "Annotation datatype configuration file found. Using datatypes from {}".format(
                    datatypesf
                )
            )
            with datatypesf.open() as dtf:
                # skip header.
                l = dtf.readline()
                for l in dtf:
                    df = l.rstrip("\n").split()
                    col = df[0]
                    dtype = df[1]
                    if dtype.lower() not in TabixAnnotationDao.DATA_CONVS:
                        raise ConfigurationException(
                            "Unkown datatype given in datatype configuration file. Type given {}. Accepted types: {}".format(
                                dtype,
                                ",".join(list(TabixAnnotationDao.DATA_CONVS.keys())),
                            )
                        )
                    self.dconv[col] = TabixAnnotationDao.DATA_CONVS[dtype]
        else:
            print(
                "No annotation datatype configuration found. Data will be stored as is."
            )

    def get_single_variant_annotations(self, variant: Variant, cpra) -> Variant:
        res = self.get_variant_annotations([variant], cpra)
        for r in res:
            if r == variant:
                return r
        return None

    def get_variant_annotations(self, variants: List[Variant], cpra):
        annotations = []
        t = time.time()
        tabixf =pysam.TabixFile(self.matrix_path, parser=None)
        for variant in variants:
            fetch_chr = (
                str(variant.chr)
                .replace("X", "23")
                .replace("Y", "24")
                .replace("Y", "25")
            )

            tabix_iter = tabixf.fetch(fetch_chr, variant.pos - 1, variant.pos)


            while True:
                try:
                    row = next(tabix_iter)
                except Exception as e:
                    print("no annotation found {}:{}".format(variant.chr, variant.pos))
                    break
                if row is None:
                    break
                split = row.split("\t")
                if cpra:
                    v = split[0].split(":")
                    v = Variant(v[0], v[1], v[2], v[3])
                else:
                    v = Variant(split[0], split[1], split[3], split[4])
                if variant == v:
                    ## keeps all old annotations in the returned variant.
                    for k, anno in variant.get_annotations().items():
                        v.add_annotation(k, anno)
                    v.add_annotation(
                        "annot",
                        {
                            self.headers[i]: self.dconv[self.headers[i]](split[i])
                            for i in range(0, len(split))
                        },
                    )
                    annotations.append(v)
                    break

        print(
            "TABIX get_variant_annotations " + str(round(10 * (time.time() - t)) / 10)
        )
        return annotations

    def get_variant_annotations_range(self, chrom, start, end, cpra):
        try:
            tabix_iter =pysam.TabixFile(self.matrix_path, parser=None).fetch(chrom, start - 1, end)
        except ValueError:
            print(
                "No variants in the given range. {}:{}-{}".format(chrom, start - 1, end)
            )
            return []

        annotations = []
        for row in tabix_iter:

            split = row.split("\t")
            if cpra:
                v = split[0].split(":")
                v = Variant(v[0], v[1], v[2], v[3])
            else:
                v = Variant(split[0], split[1], split[3], split[4])
            v.add_annotation(
                "annot",
                {
                    self.headers[i]: self.dconv[self.headers[i]](split[i])
                    for i in range(0, len(split))
                },
            )
            annotations.append(v)

        return annotations

    def get_gene_functional_variant_annotations(self, gene):
        if gene not in self.gene_region_mapping:
            return []
        chrom, start, end = self.gene_region_mapping[gene]
        annotations = []
        t = time.time()

        if self.n_calls == 0:
            self.start = time.time()
            self.last_time = time.time()
        try:
            tabix_iter =  pysam.TabixFile(self.matrix_path, parser=None).fetch(
                chrom.replace("X", "23"), start - 1, end)
        except Exception as e:
            print("Error occurred {}".format(e))
            return annotations
        for row in tabix_iter:
            split = row.split("\t")
            chrom, pos, ref, alt = split[0].split(":")
            if (
                split[self.header_i["most_severe"]] in self.functional_variants
                and split[self.header_i[self.gene_column]].upper() == gene.upper()
            ):
                v = Variant(chrom, pos, ref, alt)
                var_dat = {
                    self.headers[i]: (self.dconv[self.headers[i]])(split[i])
                    for i in range(0, len(split))
                }
                v.add_annotation(
                    "annot",
                    {
                        self.headers[i]: (self.dconv[self.headers[i]])(split[i])
                        for i in range(0, len(split))
                    },
                )
                annotations.append(v)
        self.n_calls += 1
        if self.n_calls % 100 == 0:
            print(
                "last 100 in {} seconds. {} calls in {} seconds".format(
                    time.time() - self.last_time, self.n_calls, time.time() - self.start
                )
            )
            self.last_time = time.time()
        # print('TABIX get_gene_functional_variant_annotations ' + str(round(10 *(time.time() - t)) / 10))
        return annotations


class LofMySQLDao(LofDB):
    def __init__(self, authentication_file):
        self.authentication_file = authentication_file
        auth_module = imp.load_source("mysql_auth", self.authentication_file)
        self.user = getattr(auth_module, "mysql")["user"]
        self.password = getattr(auth_module, "mysql")["password"]
        self.host = getattr(auth_module, "mysql")["host"]
        self.db = getattr(auth_module, "mysql")["db"]
        self.release = getattr(auth_module, "mysql")["release"]

    def get_connection(self):
        return pymysql.connect(
            host=self.host, user=self.user, password=self.password, db=self.db
        )

    def get_all_lofs(self, p_threshold):
        conn = self.get_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                sql = "SELECT * FROM lof WHERE rel=%s AND p_value < %s"
                cursori.execute(sql, [self.release, p_threshold])
                result = [{"gene_data": data} for data in cursori.fetchall()]
        finally:
            conn.close()
        return result

    def get_lofs(self, gene):
        conn = self.get_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                sql = "SELECT * FROM lof WHERE rel=%s AND gene=%s"
                cursori.execute(sql, [self.release, gene])
                result = [{"gene_data": data} for data in cursori.fetchall()]
        finally:
            conn.close()
        return result


class ElasticLofDao(LofDB):
    def __init__(self, host, port, gene_index):

        self.index = gene_index
        self.host = host
        self.port = port

        self.elastic = Elasticsearch(host + ":" + str(port))
        if not self.elastic.ping():
            raise ValueError(
                "Could not connect to elasticsearch at " + host + ":" + str(port)
            )

        if not self.elastic.indices.exists(index=gene_index):
            raise ValueError("Elasticsearch index does not exist:" + gene_index)

    def get_all_lofs(self, p_threshold):
        t = time.time()
        result = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields": "*",
                "query": {"range": {"p_value": {"lt": p_threshold}}},
            },
        )
        print("ELASTIC get_all_lofs hits " + str(result["hits"]["total"]))
        print("ELASTIC get_all_lofs took " + str(result["took"]))
        print("ELASTIC get_all_lofs " + str(round(10 * (time.time() - t)) / 10))
        return [
            {"id": r["_id"], "gene_data": r["_source"]} for r in result["hits"]["hits"]
        ]

    def get_lofs(self, gene):
        t = time.time()
        result = self.elastic.search(
            index=self.index,
            body={
                "timeout": "5s",
                "size": 10000,
                "_source": True,
                "stored_fields": "*",
                "query": {"constant_score": {"filter": {"term": {"gene": gene}}}},
            },
        )
        print("ELASTIC get_lofs hits " + str(result["hits"]["total"]))
        print("ELASTIC get_lofs took " + str(result["took"]))
        print("ELASTIC get_lofs " + str(round(10 * (time.time() - t)) / 10))
        return [
            {"id": r["_id"], "gene_data": r["_source"]} for r in result["hits"]["hits"]
        ]


class TSVCodingDao(CodingDB):
    def __init__(self, data):
        df = (
            pd.read_csv(data, encoding="utf8", sep="\t")
            .fillna("NA")
            .replace([np.inf], 1e6)
        )
        top_i = df.groupby("variant")["pval"].idxmin
        df["is_top"] = 0
        df.loc[top_i, "is_top"] = 1
        df["phenoname"] = np.where(
            df["phenoname"] == "NA", df["pheno"], df["phenoname"]
        )
        self.coding_data = df.to_dict(orient="records")

    def get_coding(self):
        return self.coding_data


class TSVChipDao(ChipDB):
    def __init__(self, data):
        df = pd.read_csv(data, encoding="utf8", sep="\t").fillna("NA")
        top_i = df.groupby("variant")["pval"].idxmin
        df["is_top"] = 0
        df.loc[top_i, "is_top"] = 1
        self.chip_data = df.to_dict(orient="records")

    def get_chip(self):
        return self.chip_data


class FineMappingMySQLDao(FineMappingDB):
    def __init__(self, authentication_file, base_paths):
        self.authentication_file = authentication_file
        self.base_paths = base_paths
        auth_module = imp.load_source("mysql_auth", self.authentication_file)
        self.user = getattr(auth_module, "mysql")["user"]
        self.password = getattr(auth_module, "mysql")["password"]
        self.host = getattr(auth_module, "mysql")["host"]
        self.db = getattr(auth_module, "mysql")["db"]
        self.release = getattr(auth_module, "mysql")["release"]

    def get_connection(self):
        return pymysql.connect(
            host=self.host, user=self.user, password=self.password, db=self.db
        )

    def get_max_region(self, phenocode, chr, start, end):
        conn = self.get_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                sql = "SELECT min(start) as start, max(end) AS end FROM finemapped_regions WHERE rel=%s AND phenocode=%s AND chr=%s AND start <= %s AND end >= %s"
                cursori.execute(sql, [self.release, phenocode, chr, end, start])
                result = cursori.fetchone()
        finally:
            conn.close()
        return result

    def get_regions(self, variant: Variant):
        conn = self.get_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                sql = "SELECT type, phenocode, chr, start, end, path FROM finemapped_regions WHERE rel=%s AND chr=%s AND start <= %s AND end >= %s"
                cursori.execute(
                    sql, [self.release, variant.chr, variant.pos, variant.pos]
                )
                result = cursori.fetchall()
                for res in result:
                    res["path"] = self.base_paths[res["type"]] + "/" + res["path"]
        finally:
            conn.close()
        return result

    def get_regions_for_pheno(
        self, type, phenocode, chr, start, end, get_most_probable_finemap_n=True
    ):
        conn = self.get_connection()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                if type == "all":
                    sql = "SELECT type, chr, start, end, n_signals, n_signals_prob, variants, path FROM finemapped_regions WHERE rel=%s AND phenocode=%s AND chr=%s AND start <= %s AND end >= %s ORDER BY type DESC"
                    cursori.execute(sql, [self.release, phenocode, chr, end, start])
                elif type == "conditional":
                    sql = "SELECT type, chr, start, end, n_signals, variants, path FROM finemapped_regions WHERE rel=%s AND type=%s AND phenocode=%s AND chr=%s AND start <= %s AND end >= %s"
                    cursori.execute(
                        sql, [self.release, "conditional", phenocode, chr, end, start]
                    )
                elif type == "finemapping":
                    sql = "SELECT type, chr, start, end, n_signals, n_signals_prob, path FROM finemapped_regions WHERE rel=%s AND (type=%s OR type=%s) AND phenocode=%s AND chr=%s AND start <= %s AND end >= %s ORDER BY type DESC"
                    cursori.execute(
                        sql,
                        [self.release, "susie", "finemap", phenocode, chr, end, start],
                    )
                else:
                    raise ValueError('unsupported type "' + type + '"')
            result = cursori.fetchall()
            result = [res for res in result if res["type"] in self.base_paths]
        finally:
            conn.close()
        for res in result:
            res["path"] = self.base_paths[res["type"]] + "/" + res["path"]
            if res["type"] == "conditional":
                res["paths"] = []
                res["conditioned_on"] = []
                vars = res["variants"].split(",")
                for i in range(0, len(vars)):
                    # R3 res['paths'].append(res['path'] + '-'.join(vars[0:i+1]) + '.conditional')
                    res["paths"].append(
                        res["path"] + vars[0] + "_" + str((i + 1)) + ".conditional"
                    )
                    res["conditioned_on"].append(",".join(vars[0 : i + 1]))
        if get_most_probable_finemap_n:
            most_probable_finemap = -1
            prob = 0
            for i, res in enumerate(result):
                if res["type"] == "finemap" and res["n_signals_prob"] > prob:
                    most_probable_finemap = i
                    prob = res["n_signals_prob"]
            result = [
                res
                for i, res in enumerate(result)
                if res["type"] != "finemap" or i == most_probable_finemap
            ]
        return result


class AutoreportingDao(AutorepVariantDB):
    def __init__(self, authentication_file, group_report_path):
        self.authentication_file = authentication_file
        self.group_report_path = group_report_path
        auth_module = imp.load_source("mysql_auth", self.authentication_file)
        self.user = getattr(auth_module, "mysql")["user"]
        self.password = getattr(auth_module, "mysql")["password"]
        self.host = getattr(auth_module, "mysql")["host"]
        self.db = getattr(auth_module, "mysql")["db"]
        self.release = getattr(auth_module, "mysql")["release"]

    def get_connection(self):
        return pymysql.connect(
            host=self.host, user=self.user, password=self.password, db=self.db
        )

    def get_group_variants(self, phenotype, locus_id):
        try:
            conn = self.get_connection()
            with conn.cursor(pymysql.cursors.DictCursor) as cursori:
                sql = "SELECT * FROM autoreporting_variants WHERE rel=%s AND phenotype=%s AND locus_id=%s"
                cursori.execute(sql, ["r{}".format(self.release), phenotype, locus_id])
                result = cursori.fetchall()
            return result
        finally:
            conn.close()


    def get_group_report(self,phenotype) -> List[Dict[str,Union[str,int,float,bool]]]:
        """Returns the records in a group report as a list of dictionaries, one for each group.
        Dictionary keys, with value: value identifier (key):
        locus lead variant: locus_id
        phenotype name: phenocode
        cs quality: good_cs
        chromosome : chrom
        pvalue: pval
        lead mlogp: lead_mlogp
        lead beta: lead_beta
        lead Finnish enrichment: lead_enrichment
        lead alt allele af: lead_af_alt
        lead most severe gene: lead_most_severe_gene
        functional variants in cs: functional_variants_strict
        cs variants: credible_set_variants
        cs size: cs_size
        cs log10bf: cs_log_bayes_factor

        """

        filename = os.path.join(self.group_report_path,f"{phenotype}.top.out")
        if os.path.exists(filename):
            with open(filename) as f:
                hdr = f.readline().strip("\n").split("\t")
                hdi = {a:i for i,a in enumerate(hdr)}
                data = []
                for _line in f:
                    cols = _line.strip("\n").split("\t")
                    #some columns are named differently in R5
                    if self.release == 5:
                        record = {
                            "chrom":cols[hdi["chr"]],
                            "pval":float(cols[hdi["lead_pval"]]),
                            "lead_enrichment":float(cols[hdi["enrichment"]]) if cols[hdi["enrichment"]] != "NA" else float("nan"),
                            "lead_af_alt":float(cols[hdi["lead_AF"]]) if cols[hdi["lead_AF"]] != "NA" else float("nan"),
                            "lead_most_severe_gene":cols[hdi["most_severe_gene"]],
                            
                        }
                    else:
                        record = {
                            "chrom":cols[hdi["chrom"]],
                            "pval":float(cols[hdi["pval"]]),
                            "lead_enrichment":float(cols[hdi["lead_enrichment"]]) if cols[hdi["lead_enrichment"]] != "NA" else float("nan"),
                            "lead_af_alt":float(cols[hdi["lead_af_alt"]]) if cols[hdi["lead_af_alt"]] != "NA" else float("nan"),
                            "lead_most_severe_gene":cols[hdi["lead_most_severe_gene"]],
                        }
                    #common cols
                    record.update(
                        {
                            "locus_id":cols[hdi["locus_id"]],
                            "phenocode":phenotype,
                            "good_cs":bool(cols[hdi["good_cs"]]),
                            "lead_mlogp":float(cols[hdi["lead_mlogp"]]),
                            "lead_beta":float(cols[hdi["lead_beta"]]),
                            "functional_variants_strict":cols[hdi["functional_variants_strict"]],
                            "credible_set_variants":cols[hdi["credible_set_variants"]],
                            "cs_size":int(cols[hdi["cs_size"]]),
                            "cs_log_bayes_factor":float(cols[hdi["cs_log_bayes_factor"]]) if cols[hdi["cs_log_bayes_factor"]] != "NA" else float("nan")

                        }
                    )
                    #join trait cols
                    if "specific_efo_trait_associations_relaxed" in hdr:
                        merge_func = lambda a,b : ";".join(list(filter(lambda x:x!="NA",[a,b])))
                        all_traits_strict = merge_func(
                            cols[hdi["specific_efo_trait_associations_strict"]],
                            cols[hdi["found_associations_strict"]]
                        )
                        all_traits_relaxed = merge_func(
                            cols[hdi["specific_efo_trait_associations_relaxed"]],
                            cols[hdi["found_associations_relaxed"]]
                        )
                        all_traits_strict = "NA" if all_traits_strict == "" else all_traits_strict
                        all_traits_relaxed = "NA" if all_traits_relaxed == "" else all_traits_relaxed
                    else:
                        all_traits_strict = cols[hdi["found_associations_strict"]]
                        all_traits_relaxed = cols[hdi["found_associations_relaxed"]]
                    record["all_traits_strict"] = all_traits_strict
                    record["all_traits_relaxed"] = all_traits_relaxed
                    data.append(record)
            return data
        return []

class DataFactory(object):
    arg_definitions = {
        "PHEWEB_PHENOS": lambda _: {
            pheno["phenocode"]: pheno for pheno in get_phenolist()
        },
        "PHEWEB_USE_PHENOS": lambda : copy.deepcopy(get_use_phenocode_pheno_map()),
        "MATRIX_PATH": common_filepaths["matrix"],
        "ANNOTATION_MATRIX_PATH": common_filepaths["annotation-matrix"],
        "GNOMAD_MATRIX_PATH": common_filepaths["gnomad-matrix"],
    }

    def __init__(self, config):
        self.dao_impl = {}
        for db in config:
            for db_type in db.keys():
                for db_source in db[db_type]:
                    db_id = db_type + "." + db_source
                    daomodule = importlib.import_module(".db", __package__)
                    daoclass = getattr(daomodule, db_source)
                    if "const_arguments" in db[db_type][db_source]:
                        for a, b in db[db_type][db_source]["const_arguments"]:
                            if b not in self.arg_definitions:
                                raise Exception(b + " is an unknown argument")
                            db[db_type][db_source][a] = self.arg_definitions[b]
                        db[db_type][db_source].pop("const_arguments", None)
                    print(db_type, db_source)
                    self.dao_impl[db_type] = daoclass(**db[db_type][db_source])

        self.dao_impl["geneinfo"] = NCBIGeneInfoDao()
        self.dao_impl["catalog"] = MichinganGWASUKBBCatalogDao()
        self.dao_impl["drug"] = DrugDao()

        if "externalresult" not in self.dao_impl:
            ## if external results not configured initialize dao always returning empty results
            self.dao_impl["externalresult"] = ExternalFileResultDao(None)

    def get_autocompleter(self):
        return self.dao_impl["autocompleter"] if "autocompleter" in self.dao_impl else None

    def get_annotation_dao(self):
        return self.dao_impl["annotation"]

    def get_gnomad_dao(self):
        return self.dao_impl["gnomad"]

    def get_lof_dao(self):
        return self.dao_impl["lof"] if "lof" in self.dao_impl else None

    def get_result_dao(self):
        return self.dao_impl["result"]

    def get_geneinfo_dao(self):
        return self.dao_impl["geneinfo"]

    def get_knownhits_dao(self):
        return self.dao_impl["catalog"]

    def get_drug_dao(self):
        return self.dao_impl["drug"]

    def get_coding_dao(self):
        return self.dao_impl["coding"] if "coding" in self.dao_impl else None

    def get_chip_dao(self):
        return self.dao_impl["chip"] if "chip" in self.dao_impl else None

    def get_finemapping_dao(self):
        return self.dao_impl["finemapping"] if "finemapping" in self.dao_impl else None

    def get_autoreporting_dao(self):
        return (
            self.dao_impl["autoreporting"] if "autoreporting" in self.dao_impl else None
        )

    def get_UKBB_dao(self, singlematrix=False):
        if singlematrix and "externalresultmatrix" in self.dao_impl:
            return self.dao_impl["externalresultmatrix"]
        else:
            return self.dao_impl["externalresult"]

    def get_colocalization_dao(self):
        return (
            self.dao_impl["colocalization"]
            if "colocalization" in self.dao_impl
            else None
        )

    def get_chip_dao(self):
        return self.dao_impl["chip"] if "chip" in self.dao_impl else None

    def get_variant_phenotype_pip_dao(self):
        return self.dao_impl["variant_phenotype_pip"] if "variant_phenotype_pip" in self.dao_impl else None

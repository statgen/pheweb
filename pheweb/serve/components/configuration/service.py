from flask import Blueprint, current_app as app, request, jsonify, abort
from itertools import chain
import requests
from pheweb.serve.components.model import ComponentCheck, ComponentStatus, ComponentDTO, CompositeCheck
import json
import logging
import random
from datetime import date
logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.ERROR)

configuration = Blueprint("configuration", __name__)

@configuration.route("/api/configuration", methods=["GET"])
def get_configuration():
    # this is the simplest configuration can be improved upon
    return dict(dbs_fact=app.jeeves.dbs_fact is None,
                annotation=app.jeeves.annotation_dao is None,
                gnomad=app.jeeves.gnomad_dao is None,
                lof=app.jeeves.lof_dao is None,
                result=app.jeeves.result_dao is None,
                ukbb=app.jeeves.ukbb_dao is None,
                ukbb_matrix=app.jeeves.ukbb_matrixdao is None,
                coding=app.jeeves.coding_dao is None,
                finemapping=app.jeeves.finemapping_dao is None,
                knownhits=app.jeeves.knownhits_dao is None,
                autoreporting=app.jeeves.autoreporting_dao is None,
                colocalization=app.jeeves.colocalization is None,
                variant_phenotype=app.jeeves.variant_phenotype is None,
                autocompleter=app.jeeves.autocompleter_dao is None,
                pqtl_colocalization=app.jeeves.pqtl_colocalization is None,
                health=app.jeeves.health_dao is None,
    )

# Helper methods
def get_random_phenocode():
    from pheweb.serve.server import active_phenolist
    phenotype=random.choice(active_phenolist())
    phenocode=phenotype["phenocode"]
    return phenocode

def get_random_variant():
    from pheweb.serve.server import api_pheno
    phenocode=get_random_phenocode()
    variant=random.choice(api_pheno(phenocode)["unbinned_variants"])
    return variant

def get_random_gene():
    from pheweb.utils import get_gene_tuples
    gene_tuple=next(chain((x for x in get_gene_tuples() if random.randint(1, 100) == 1),  get_gene_tuples()))
    return gene_tuple[-1]

def get_random_region():
    variant=get_random_variant()
    chromosome=variant['chrom']
    position=variant['pos']
    width=200 * 1000
    start_position = max(0, position - width)
    end_position = position + width
    return dict(chromosome=chromosome,
                start_position=start_position,
                end_position=end_position)
    
def get_random_filter_param():
    region = get_random_region()
    filter_param=f"""analysis in 3 and chromosome in '{region["chromosome"]}' and position ge {region["start_position"]} and position le {region["end_position"]}"""
    return filter_param

def check_url(url):
    with app.test_client() as client:
        from flask import g
        g.is_test = True
        response = client.get(url)
        return ComponentStatus(response.status_code == 200 , [ f"status {response.status_code}"])

# Endpoint checks
class HomePageCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        return check_url("")

class AutoreportCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao = app.jeeves.autoreporting_dao
        if dao is None:
            return ComponentStatus(True, ["autoreporting not configured"])
        else:
            phenocode=get_random_phenocode()
            return check_url(f'/api/autoreport/{phenocode}')

class AutoreportVariantsCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao = app.jeeves.autoreporting_dao
        if dao is None:
            return ComponentStatus(True, ["autoreporting not configured"])
        else:
            variant=get_random_variant()
            locus_id=f"{variant['chrom']}:{variant['pos']}:{variant['ref']}:{variant['alt']}"
            phenocode=get_random_phenocode()
            return check_url(f'/api/autoreport_variants/{phenocode}/{locus_id}')
                

class PhenocodeCheck(ComponentCheck):
    
    def get_status(self,) -> ComponentStatus:
        phenocode=get_random_phenocode()
        return check_url(f'/api/pheno/{phenocode}')
        
class PhenolistCheck(ComponentCheck):
    
    def get_status(self,) -> ComponentStatus:
        return check_url('/api/phenos')
    
class VariantCheck(ComponentCheck):
    # def api_variant(query):
    def get_status(self,) -> ComponentStatus:
         variant=get_random_variant()
         url=f"/api/variant/{variant['chrom']}:{variant['pos']}:{variant['ref']}:{variant['alt']}"
         return check_url(url)

class VariantPhenoCheck(ComponentCheck):
    # def api_variant_pheno(query, phenocode):
    def get_status(self,) -> ComponentStatus:
         variant=get_random_variant()
         query=f"{variant['chrom']}:{variant['pos']}:{variant['ref']}:{variant['alt']}"
         phenocode=get_random_phenocode()
         url=f'/api/variant/{query}/{phenocode}'
         return check_url(url)

class PhenoCheck(ComponentCheck):
    
    def get_status(self,) -> ComponentStatus:
        phenocode=get_random_phenocode()
        url=f'/api/manhattan/pheno/{phenocode}'
        return check_url(url)


class GenePhenotypesCheck(ComponentCheck):
    
    def get_status(self,) -> ComponentStatus:
        genename=get_random_gene()
        url=f'/api/gene_phenos/{genename}'
        return check_url(url)
    
class GeneFunctionalVariantsCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        genename=get_random_gene()
        url=f'/api/gene_functional_variants/{genename}'
        return check_url(url)
    
class LOFCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao = app.jeeves.lof_dao
        if dao is None:
            return ComponentStatus(True, ["loss of function not configured"])
        else:
            return check_url("/api/lof")
        
class LOFGeneCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        genename=get_random_gene()
        return check_url(f"/api/lof/{genename}")
        
class PhenoQQCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        phenocode=get_random_phenocode()
        return check_url(f'/api/qq/pheno/{phenocode}')
    
class UKBBNSCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        phenocode=get_random_phenocode()
        return check_url(f'/api/ukbb_n/{phenocode}')
    
class RegionPageCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        phenocode=get_random_phenocode()
        region=get_random_region()
        region=f"""{region["chromosome"]}:{region["start_position"]}-{region["end_position"]}"""
        return check_url(f'/api/region/{phenocode}/{region}')

class RegionCheck(ComponentCheck):

    def get_status(self,) -> ComponentStatus:
        region=get_random_region()
        phenocode=get_random_phenocode()
        filter_param=get_random_filter_param()
        return check_url(f'/api/region/{phenocode}/lz-results/?filter={filter_param}') 


class ApiConditionalRegionCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao = app.jeeves.finemapping_dao
        if dao is None:
            return ComponentStatus(True, ["finemapping not configured"])
        else:
            phenocode=get_random_phenocode()
            region=get_random_region()
            filter_param=get_random_filter_param()
            return check_url(f'/api/conditional_region/{phenocode}/lz-results/?filter={filter_param}') 

class ApiFinemapedRegionCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao = app.jeeves.finemapping_dao
        if dao is None:
            return ComponentStatus(True, ["finemapping not configured"])
        else:
            region=get_random_region()
            filter_param=get_random_filter_param()
            phenocode=get_random_phenocode()
            return check_url(f'/api/finemapped_region/{phenocode}/lz-results/?filter={filter_param}')

class GenePQTLColocalizationCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        dao=app.jeeves.pqtl_colocalization
        if dao is None:
            return ComponentStatus(True, ["autoreporting not configured"])
        else:
            genename=get_random_gene()
            return check_url(f'/api/gene_pqtl_colocalization/{genename}')
        
class GeneReportCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        genename=get_random_gene()
        return check_url(f'/api/genereport/{genename}')
        
class DrugsCheck(ComponentCheck):
    def get_status(self,) -> ComponentStatus:
        genename=get_random_gene()
        return check_url(f'/api/drugs/{genename}')

last_ncbi_check_date = None
class NCBICheck(ComponentCheck):
    # Only call this once a day
    # def ncbi(endpoint):
    def get_status(self,) -> ComponentStatus:
        global last_ncbi_check_date
        today = date.today()
        print(today, last_ncbi_check_date)
        if last_ncbi_check_date != today:
            last_ncbi_check_date  = today
            
            region=get_random_region()
            endpoint="esearch.fcgi"
            db='clinvar'
            retmode='json'
            term=f"""{region["chromosome"]}[chr]{region["start_position"]}:{region["end_position"]}[chrpos]"clinsig pathogenic"[Properties]""",
            retmax=500
            result = check_url(f'/api/ncbi/{endpoint}?db={db}&retmode={retmode}&term={term}&retmax={retmax}')
        else:
            result = ComponentStatus(is_okay=True, messages=f"skipping for {last_ncbi_check_date}")
        return result
    
all_checks=[
    # HomePageCheck(),
    AutoreportCheck(),
    AutoreportVariantsCheck(),
    PhenocodeCheck(),
    PhenolistCheck(),
    VariantCheck(),    
    VariantPhenoCheck(),
    PhenoCheck(),
    GenePhenotypesCheck(),
    GeneFunctionalVariantsCheck(),
    LOFCheck(),
    LOFGeneCheck(),
    PhenoQQCheck(),
    UKBBNSCheck(),
    RegionPageCheck(),
    RegionCheck(),
    ApiConditionalRegionCheck(),
    ApiFinemapedRegionCheck(),
    GenePQTLColocalizationCheck(),
    # GeneReportCheck(), # TODO 
    DrugsCheck(),
    NCBICheck(),
]

class ConfigurationCheck(CompositeCheck):

    def __init__(self, allowed_checks=None):
        super().__init__()
        for check in all_checks:
            self.add_check(check)
            
    def get_name(self,) -> str:
        return "configuration"

    
component = ComponentDTO(configuration, ConfigurationCheck())


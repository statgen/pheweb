import json
import abc
import requests
from typing import Union, Dict

"""
This package queries `opentargets<https://www.opentargets.org/>`
and returns the drug information related to the gene name.

There is a `playground<https://api.platform.opentargets.org/api/v4/graphql/browser>` 
to develop the graphql queries.

Documentation on how to query :
`tutorial <https://genetics-docs.opentargets.org/data-access/graphql-api>`
`presentation <https://platform-docs.opentargets.org/data-access/graphql-api>`
`training <https://www.ebi.ac.uk/training/events/getting-started-open-targets-platform-graphql-api/>`
`blog post <https://clarewest.github.io/blog/post/crash-course-in-open-targets-part-1/>`
"""


class DrugDB(object):
    @abc.abstractmethod
    def get_drugs(self, gene) -> object:
        """
        Retrieve drugs for a given gene

        @param gene: gene name
        @return: information about drugs associated with the gene
        """
        return


def nvl_attribute(name: str, obj: Union[None, Dict], default):
    """
    Given an name and a value return
    the dictionary lookup of the name
    if the value is a dictionary.
    The default is returned if not
    found.

    @param name: name to lookup
    @param obj: object to look into
    @param default: value to return if not found.
    @return: value if found otherwise default
    """
    return obj[name] if obj and name in obj else default


def copy_attribute(name, src, dst):
    """
    Given a name copy attribute from
    source object to destination object
    @param name: field name
    @param src: source object
    @param dst: destination object
    @return: destination object
    """
    if src and name in src:
        dst[name] = src[name] 
    return dst

def extract_rows(response, gene_name):
    """

    @param response:
    @param gene_name:
    @return:
    """
    data = nvl_attribute('data', response, {})
    search = nvl_attribute('search', data, {})
    hits = nvl_attribute('hits', search, [])
    hits = sorted(hits, key=lambda x: x['score'], reverse=True)
    hit = next((h for h in hits if h['name'] == gene_name), {})
    target = nvl_attribute('object', hit, {})
    known_drugs = nvl_attribute('knownDrugs', target, {})
    rows = nvl_attribute('rows', known_drugs, [])
    return rows


def reshape_row(row):
    """
    The response object needs to be reshaped
    to a list of rows:

    the fields of the rows are


    approvedName: string
    diseaseName: string
    drugId: string
    drugType: string
    maximumClinicalTrialPhase: number
    mechanismOfAction: string
    phase: number
    prefName: string
    targetClass: array[string]


    @param row:
    @return: reshaped row
    """
    result = {}
    if 'disease' in row:
        disease = row['disease']
        if 'name' in disease:
            result['diseaseName'] = disease['name']
        db_xrefs = disease['dbXRefs'] if 'dbXRefs' in disease else []
        efo_info = next((d for d in db_xrefs if d.startswith('EFO:')), None)
        if efo_info:
            result['EFOInfo'] = efo_info
    if 'drug' in row:
        drug = row['drug']
        copy_attribute('maximumClinicalTrialPhase', drug, result)
    names = ['approvedName',
             'drugId',
             'drugType',
             'mechanismOfAction',
             'phase',
             'prefName',
             'targetClass']
    for name in names:
        copy_attribute(name, row, result)
    return result


def query_endpoint(gene_name):
    """

    @param gene_name:
    @return:
    """
    # see : https://platform-docs.opentargets.org/data-access/graphql-api
    # Build query string
    query_string = """
            query search($gene_name: String!) {
              search( queryString : $gene_name , entityNames:["target"] ) {
                hits {
                  score
                  name
                  object {
                    __typename ... on Target { id
                    approvedSymbol
                        approvedName
                        knownDrugs { rows {
                                            # evidence.drug2clinic.clinical_trial_phase.label
                                            phase
                                            # target.target_class
                                            targetClass
                                            # evidence.target2drug.action_type
                                            drugType
                                            drugId
                                            prefName
                                            approvedName
                                            mechanismOfAction
                                            # disease.efo_info.label
                                            disease { dbXRefs , name }
                                            drug {
                                                   # evidence.drug2clinic.max_phase_for_disease.label
                                                   maximumClinicalTrialPhase ,
                                                   # drug
                                                   name

                        } } }
                    }

                  }
                }
              }
            }
        """
    variables = {"gene_name": gene_name}
    # Set base URL of GraphQL API endpoint
    base_url = "https://api.platform.opentargets.org/api/v4/graphql"

    # Perform POST request and check status code of response
    r = requests.post(base_url,
                      json={"query": query_string, "variables": variables})
    assert r.status_code == 200, f"failed fetching drugs : ${r}"
    response = json.loads(r.text)
    return response


def fetch_drugs(gene_name):
    """

    @param gene_name:
    @return:
    """
    response = query_endpoint(gene_name)
    rows = extract_rows(response, gene_name)
    rows = list(map(reshape_row, rows))
    return rows


class DrugDao(DrugDB):
    """

    """
    def __init__(self):
        pass

    def get_drugs(self, gene_name):
        """

        @param gene_name:
        @return:
        """
        return fetch_drugs(gene_name)

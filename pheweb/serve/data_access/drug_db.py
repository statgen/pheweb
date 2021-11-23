import json
import abc
import attr
import requests

class DrugDB(object):
    @abc.abstractmethod
    def get_drugs(self, gene):
        """ Retrieve drugs
            Args: gene name
            Returns: drugs targeting the gene
        """
        return

def nvl_attribute(name, obj, default):
    return obj[name] if obj and name in obj else default

def copy_attribute(name, src, dst):
    if src and name in src:
        src[name] = dst[name]

def reshape_response(response):
    data = nvl_attribute('data', response,  {})
    search = nvl_attribute('search', data, {})
    hits = nvl_attribute('hits', search, [])
    hits = sorted(hits, key=lambda x : x['score'], reverse=True)
    hit = next((h for h in hits if h['name'] == gene_name),{})
    target = nvl_attribute('object', hit, {})
    knownDrugs = nvl_attribute('knownDrugs', target, {})
    rows = nvl_attribute('rows', knownDrugs, [])

    def format_row(r):
        result = {}
        if 'disease' in r:
            disease = r['disease']
            if 'name' in disease:
                result['diseaseName'] = disease['name']
            dbXRefs = disease['dbXRefs'] if 'dbXRefs' in disease else []
            EFOInfo = next((d for d in dbXRefs if d.startswith('EFO:')), None)
            if EFOInfo:
                result['EFOInfo'] = EFOInfo
        if 'drug' in r:
            drug = r['drug']
            copy_attribute('maximumClinicalTrialPhase', drug, result)
        names = [ 'approvedName' ,
                  'drugId' ,
                  'drugType' ,
                  'mechanismOfAction' ,
                  'phase' ,
                  'prefName' ,
                  'targetClass' ]
        for name in names:
            copy_attribute(name, r, result)
        return result
    return list(map(format_row,rows))


def query_endpoint(gene_name):
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
        r = requests.post(base_url, json={"query": query_string, "variables": variables})
        assert r.status_code == 200 , f"failed fetching drugs : ${r}"
        response = json.loads(r.text)
        return response
    

class DrugDao(DrugDB):

    def __init__(self):
        pass

    def get_drugs(self, gene_name):
        # see : https://platform-docs.opentargets.org/data-access/graphql-api
        # Build query string                                                                                                                                                                           
        response = query_endpoint(gene_name)
        response = reshape_response(response)
        return response

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

class DrugDao(DrugDB):

    def __init__(self):
        pass

    def get_drugs(self, gene_name):
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
        r = requests.post(base_url, json={"query": query_string, "variables": variables})
        assert r.status_code == 200 , f"failed fetching drugs : ${r}"
        response = json.loads(r.text)
        data = response['data'] if response and 'data' in response else {}
        search = data['search'] if data and 'search' in data else {}
        hits = search['hits'] if search and 'hits' in search else []
        hits = sorted(hits, key=lambda x : x['score'], reverse=True)
        hit = next((h for h in hits if h['name'] == gene_name),{})
        target = hit['object'] if hit and 'object' in hit else {}
        knownDrugs = target['knownDrugs'] if target and 'knownDrugs' in target else {}
        rows = knownDrugs['rows'] if knownDrugs and 'rows' in knownDrugs else []

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
                if 'maximumClinicalTrialPhase' in drug:
                    result['maximumClinicalTrialPhase'] = drug['maximumClinicalTrialPhase']
            for k in [ 'approvedName' ,'drugId' , 'drugType' , 'mechanismOfAction' , 'phase' , 'prefName' , 'targetClass' ]:
                if r and k in r:
                    result[k] = r[k]
            return result
        return list(map(format_row,rows))

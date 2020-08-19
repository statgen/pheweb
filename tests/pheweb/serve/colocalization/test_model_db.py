from pheweb.serve.colocalization.model_db import ColocalizationDAO

def test_can_insert():
    dao = ColocalizationDAO('sqlite:///:memory:')
    

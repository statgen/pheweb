from flask.json import JSONEncoder

class FGJSONEncoder(JSONEncoder):
    def __init__(self, *args, **kwargs):
        super().__init__(*args,**kwargs)

    def default(self,o):
        try:
            rep =o.json_rep()
        except Exception as e:
            pass
        else:
            return rep
        return JSONEncoder.default(self, o)

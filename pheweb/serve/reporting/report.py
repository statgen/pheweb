
import re
from latex import build_pdf


class Report(object) :

    LATEX_SUBS = (
        ##(re.compile(r'\\'), r'\\textbackslash'),
        (re.compile(r'([{}_#%&])'), r'\\\1'),
        (re.compile(r'~'), r'\~{}'),
        (re.compile(r'\^'), r'\^{}'),
        (re.compile(r'"'), r"''"),
        (re.compile(r'\.\.\.+'), r'\\ldots'),
        (re.compile(r'<'), r'\\textless'),
        (re.compile(r'>'), r'\\textgreater')
    )

    def escape_tex(self, value):
        newval = value
        for pattern, replacement in self.LATEX_SUBS:
            newval = pattern.sub(replacement, newval)
        return newval

    def __init__(self, flaskapp):
        self.app = flaskapp
        self.texenv = self.app.create_jinja_environment()
        self.texenv.block_start_string = '((*'
        self.texenv.block_end_string = '*))'
        self.texenv.variable_start_string = '((('
        self.texenv.variable_end_string = ')))'
        self.texenv.comment_start_string = '((='
        self.texenv.comment_end_string = '=))'
        self.texenv.filters['escape_tex'] = self.escape_tex


    def render_template(self, template, **params):
        '''

        '''
        tmpl = self.texenv.get_template(template)
        f= open("/mnt/r2/mitja/templaatti.tex",'wt' )
        f.write(tmpl.render(**params))
        return build_pdf(tmpl.render(**params))

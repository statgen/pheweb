import re
from pheweb.serve.components.coding.exceptions import ParseException

var_re = re.compile('-|_|:|\\|')


class Variant(object):

    def __init__(self, varstr):
        s = var_re.split(varstr)
        if len(s) != 4:
            raise ParseException(
                'variant needs to contain four fields, supported separators are - _ : |')
        try:
            chr = re.sub(r'^0', '', str(s[0]))
            chr = int(chr.lower().replace('chr', '').replace('x', '23')
                      .replace('y', '24').replace('mt', '25').replace('m', '25'))
            if chr < 1 or chr > 25:
                raise ValueError
        except ValueError:
            raise ParseException('supported chromosomes: 1-23,X,Y,M,MT')
        try:
            pos = int(s[1])
        except ValueError:
            raise ParseException('position must be an integer')
        self.chr = chr
        self.pos = pos
        self.ref = s[2].upper()
        self.alt = s[3].upper()
        if not bool(re.match(r'[ACGT]+$', self.ref)) or not bool(re.match(r'[ACGT]+$', self.alt)):
            raise ParseException('only ACGT alleles are supported')
        self.varid = "{}-{}-{}-{}".format(str(self.chr).replace(
            '23', 'X'), self.pos, self.ref, self.alt)

    def __eq__(self, other):
        return self.chr == other.chr and self.pos == other.pos and self.ref == other.ref and self.alt == other.alt

    def __hash__(self):
        return hash(self.varid)

    def __repr__(self):
        return self.varid

    def ot_repr(self):
        return "{}_{}_{}_{}".format(str(self.chr).replace('23', 'X'), self.pos, self.ref, self.alt)

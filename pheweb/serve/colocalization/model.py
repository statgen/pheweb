import abc
import attr
import typing
import attr
from attr.validators import instance_of
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float, Text, ForeignKey

import re

class JSONifiable(object):
    @abc.abstractmethod
    def json_rep(self):
        """
           Return an object that can be jsonencoded.
        """
class Kwargs(object):
    @abc.abstractmethod
    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        None
        """
           Return an object that can be jsonencoded.
        """

X = typing.TypeVar('X')

def na(f):
    return lambda value : None if value == 'NA' or value == 'na' or value == 'None'  else f(value)

def ascii(value: str) -> str:
    return "".join(char for char in value if ord(char) < 128)

def nvl(value: str, f: typing.Callable[[str], X]) -> typing.Optional[X]:
    """
    Wrapper to convert strings to a given type, where the
    empty string, or None is returned as None.

    :param value: string representing type X
    :param f: function from string to type X
    :return: X or None
    """
    if value is None:
        result = None
    elif value == "":
        result = None
    else:
        result = f(value)
    return result



@attr.s
class Variant(JSONifiable):
    """

    DTO containing variant information

    """
    chromosome = attr.ib(validator=instance_of(str))
    position = attr.ib(validator=instance_of(int))
    reference = attr.ib(validator=instance_of(str))
    alternate = attr.ib(validator=instance_of(str))

    @staticmethod
    def from_str(text: str) -> typing.Optional["Variant"]:
        fragments = re.match(r'^chr(?P<chromosome>[0-9a-zA-Z]{1,2})_(?P<position>\d+)_(?P<reference>[^_]{1,1000})_(?P<alternate>.{1,1000})$', text)
        if fragments is None:
            raise Exception(text)
            None
        else:
            return Variant(chromosome=fragments.group('chromosome'),
                           position=int(fragments.group('position')),
                           reference=fragments.group('reference'),
                           alternate=fragments.group('alternate'))

    def __str__(self) -> str:
        return "chr{chromosome}_{position}_{reference}_{alternate}".format(chromosome=self.chromosome,
                                                                           position=self.position,
                                                                           reference=self.reference,
                                                                           alternate=self.alternate)

    def json_rep(self):
        return self.__dict__

    def __repr__(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    @staticmethod
    def columns(prefix : typing.Optional[str] = None, primary_key=False, nullable=False) -> typing.List[Column]:
        prefix = prefix if prefix is not None else ""
        return [ Column('{}chromosome'.format(prefix), String(2), primary_key=primary_key, nullable=nullable),
                 Column('{}position'.format(prefix), Integer, primary_key=primary_key, nullable=nullable),
                 Column('{}ref'.format(prefix), String(1000), primary_key=primary_key, nullable=nullable),
                 Column('{}alt'.format(prefix), String(1000), primary_key=primary_key, nullable=nullable), ]


    def __composite_values__(self):
        """
        These are artifacts needed for composition by sqlalchemy.
        Returns a tuple containing the constructor args.

        :return: tuple (chromosome, position, reference, alternate)
        """
        return self.chromosome, self.position, self.reference, self.alternate


@attr.s
class Locus(JSONifiable):
    """
        Chromosome coordinate range

        chromosome: chromosome
        start: start of range
        stop: end of range
    """
    chromosome = attr.ib(validator=attr.validators.and_(instance_of(str)))
    start = attr.ib(validator=instance_of(int))
    stop = attr.ib(validator=instance_of(int))

    @staticmethod
    def from_str(text: str) -> typing.Optional["Locus"]:
        """
        Takes a string representing a range and returns a tuple of integers
        (chromosome,start,stop).  Returns None if it cannot be parsed.
        """
        fragments = re.match(r'(?P<chromosome>[A-Za-z0-9]+):(?P<start>\d+)-(?P<stop>\d+)', text)
        result = None
        if fragments is None:
            result = None
        else:
            chromosome=fragments.group('chromosome')
            start=int(fragments.group('start'))
            stop=int(fragments.group('stop'))
            if start <= stop:
                result = Locus(chromosome, start, stop)
            else:
                result = None
        return result

    def __str__(self):
        """

        :return: string representation of range
        """
        return "{chromosome}:{start}-{stop}".format(chromosome=self.chromosome,
                                                    start=self.start,
                                                    stop=self.stop)

    def json_rep(self):
        return self.__dict__

    def __repr__(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    @staticmethod
    def columns(prefix : typing.Optional[str] = None) -> typing.List[Column]:
        prefix = prefix if prefix is not None else ""
        return [ Column('{}chromosome'.format(prefix), String(2), unique=False, nullable=False),
                 Column('{}start'.format(prefix), Integer, unique=False, nullable=False),
                 Column('{}stop'.format(prefix), Integer, unique=False, nullable=False) ]

@attr.s
class CausalVariantVector(JSONifiable, Kwargs):
    """ Vector of causal variants
    """
    position = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(int),
                                                               iterable_validator=instance_of(typing.List)))

    variant = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                              iterable_validator=instance_of(typing.List)))

    pip1 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(float),
                                                           iterable_validator=instance_of(typing.List)))

    pip2 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(float),
                                                           iterable_validator=instance_of(typing.List)))

    beta1 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(float),
                                                            iterable_validator=instance_of(typing.List)))

    beta2 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(float),
                                                            iterable_validator=instance_of(typing.List)))

    causalvariantid = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(int),
                                                                      iterable_validator=instance_of(typing.List)))
    rsid = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                           iterable_validator=instance_of(typing.List)))

    varid = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                            iterable_validator=instance_of(typing.List)))

    phenotype1 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                                 iterable_validator=instance_of(typing.List)))

    phenotype1_description = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                                             iterable_validator=instance_of(typing.List)))

    def json_rep(self):
        return self.__dict__

    def __repr__(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__


@attr.s
class CausalVariant(JSONifiable, Kwargs):
    """
    Causual variant DTO

    pip1, pip2, beta1, beta2, variant

    """
    id = attr.ib(validator=attr.validators.optional(instance_of(int)))
    variant = attr.ib(validator=instance_of(Variant))
    pip1 = attr.ib(validator=instance_of(float))
    pip2 = attr.ib(validator=instance_of(float))
    beta1 = attr.ib(validator=attr.validators.optional(instance_of(float)))
    beta2 = attr.ib(validator=attr.validators.optional(instance_of(float)))

    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    def json_rep(self):
        d = self.__dict__
        d = d.copy()
        d.pop("_sa_instance_state", None)
        d["position"] = self.variant.position
        d["plotid"] = "{0}:{1}_{2}/{3}".format(self.variant.chromosome,
                                               self.variant.position,
                                               self.variant.reference,
                                               self.variant.alternate)
        d["rsid"] = "chr{0}_{1}_{2}/{3}".format(self.variant.chromosome,
                                                self.variant.position,
                                                self.variant.reference,
                                                self.variant.alternate)
        d["varid"] = "{0}:{1}:{2}:{3}".format(self.variant.chromosome,
                                              self.variant.position,
                                              self.variant.reference,
                                              self.variant.alternate)
        d["variant"] = str(d["variant"])
        return d

    @staticmethod
    def from_list(variation_str: str,
                  pip1_str: str,
                  pip2_str: str,
                  beta1_str: str,
                  beta2_str: str) -> typing.List["Colocalization"]:

        variation_list = map(Variant.from_str,variation_str.split(','))
        pip1_list = map(na(float),pip1_str.split(','))
        pip2_list = map(na(float),pip2_str.split(','))
        beta1_list = map(na(float),beta1_str.split(','))
        beta2_list = map(na(float),beta2_str.split(','))

        result = list(map(lambda p : CausalVariant(*p),zip(variation_list,pip1_list,pip2_list,beta1_list,beta2_list)))
        return result

    @staticmethod
    def __composite_values__(self):
        """
        These are artifacts needed for composition by sqlalchemy.
        Returns a tuple containing the constructor args.

        :return: tuple (chromosome, start, stop)
        """
        return self.variant , self.pip1 , self.pip2 , self.beta1 ,self.beta2

@attr.s
class ColocalizationMap(JSONifiable):
    """
    Wrapper to hold causal variatns

    """
    variants = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(CausalVariant),
                                                               iterable_validator=instance_of(typing.List)))

    def json_rep(self):
        d = self.__dict__
        d["variants"] = list(map(lambda d: d.json_rep(),d["variants"]))
        return d


@attr.s
class Colocalization(Kwargs, JSONifiable):
    """
    DTO for colocalization.

    https://github.com/FINNGEN/colocalization/blob/master/docs/data_dictionary.txt

    Note : the column order is defined here.  This column order determines
    how data is loaded.

    """
    id = attr.ib(validator=attr.validators.optional(instance_of(int)))
    source1 = attr.ib(validator=instance_of(str))
    source2 = attr.ib(validator=instance_of(str))
    phenotype1 = attr.ib(validator=instance_of(str))
    phenotype1_description = attr.ib(validator=instance_of(str))
    phenotype2 = attr.ib(validator=instance_of(str))
    phenotype2_description = attr.ib(validator=instance_of(str))
    tissue1 = attr.ib(validator=attr.validators.optional(instance_of(str)))
    tissue2 = attr.ib(validator=instance_of(str))

    locus_id1 = attr.ib(validator=instance_of(Variant))
    locus_id2 = attr.ib(validator=instance_of(Variant))

    locus = attr.ib(validator=instance_of(Locus))

    clpp = attr.ib(validator=instance_of(float))
    clpa = attr.ib(validator=instance_of(float))

    beta_id1 = attr.ib(validator=attr.validators.optional(instance_of(float)))
    beta_id2 = attr.ib(validator=attr.validators.optional(instance_of(float)))


    variants_1 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(CausalVariant),
                                                                 iterable_validator=instance_of(typing.List)))
    variants_2 = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(CausalVariant),
                                                                 iterable_validator=instance_of(typing.List)))
    len_cs1 = attr.ib(validator=instance_of(int))
    len_cs2 = attr.ib(validator=instance_of(int))
    len_inter = attr.ib(validator=instance_of(int))

    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    def json_rep(self):
        d = self.__dict__
        d["locus_id1"] = str(d["locus_id1"])
        d["locus_id2"] = str(d["locus_id2"])
        d["variants_1"] = list(map(lambda c : c.json_rep(), self.variants_1))
        d["variants_2"] = list(map(lambda c : c.json_rep(), self.variants_2))
        d["cs_size_1"] = len(self.variants_1)
        d["cs_size_2"] = len(self.variants_2)
        return d

    @staticmethod
    def column_names() -> typing.List[str]:
        return [c.name for c in Colocalization.__attrs_attrs__]

    @staticmethod
    def from_list(line: typing.List[str]) -> "Colocalization":
        """
        Constructor method used to create colocalization from
        a row of data.

        the order of the columns are:
        01..05 source1, source2, phenotype1, phenotype1_description, phenotype2
        06..10 phenotype2_description, tissue1, tissue2, locus_id1, locus_id2
        11..15 chromosome, start, stop, clpp, clpa
        16..20 beta_id1, beta_id2, variation, vars_pip1, vars_pip2
        21..25 vars_beta1, vars_beta2, len_cs1, len_cs2, len_inter

        :param line: string array with value
        :return: colocalization object
        """

        colocalization = Colocalization(source1=nvl(line[0], str),
                                        source2=nvl(line[1], str),

                                        phenotype1=nvl(line[2], ascii),
                                        phenotype1_description=nvl(line[3], ascii),
                                        phenotype2=nvl(line[4], ascii),
                                        phenotype2_description=nvl(line[5], ascii),

                                        tissue1=nvl(line[6], str),
                                        tissue2=nvl(line[7], str),
                                        locus_id1=nvl(line[8], Variant.from_str),
                                        locus_id2=nvl(line[9], Variant.from_str),

                                        locus = Locus(nvl(line[10], str), # chromosome
                                                      nvl(line[11], na(int)), # start
                                                      nvl(line[12], na(int))), # stop

                                        clpp=nvl(line[13], float),
                                        clpa=nvl(line[14], float),
                                        beta_id1=nvl(line[15], na(float)),
                                        beta_id2=nvl(line[16], na(float)),
                                        variants_1 = CausalVariant.from_list(nvl(line[17], str),
                                                                             nvl(line[18], str),
                                                                             nvl(line[19], str),
                                                                             nvl(line[20], str),
                                                                             nvl(line[21], str)),

                                        variants_2 = CausalVariant.from_list(nvl(line[17], str),
                                                                             nvl(line[18], str),
                                                                             nvl(line[19], str),
                                                                             nvl(line[20], str),
                                                                             nvl(line[21], str)),

                                        len_cs1=nvl(line[22], na(int)),
                                        len_cs2=nvl(line[23], na(int)),
                                        len_inter=nvl(line[24], na(int)))
        return colocalization



@attr.s
class SearchSummary(JSONifiable):
    """
    DTO containing a summary of colocalization records for a search.

    count: number of records found
    unique_phenotype2: the number of unique phenotypes found
    unique_tissue2: the number of unique tissues found
    """
    count = attr.ib(validator=instance_of(int))
    unique_phenotype2 = attr.ib(validator=instance_of(int))
    unique_tissue2 = attr.ib(validator=instance_of(int))

    def json_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__


@attr.s
class SearchResults(JSONifiable):
    """
    DTO containing the results of a search.

    count: number of records matched, note this may be different
           from the size of colocalization if a limit term
           is used.
    colocalization: list of colocalization matches
    """
    count = attr.ib(validator=instance_of(int))
    colocalizations = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(Colocalization),
                                                                      iterable_validator=instance_of(typing.List)))

    def json_rep(self):
        return {"count": self.count,
                "colocalizations": [c.json_rep() for c in self.colocalizations]}


@attr.s
class PhenotypeList(JSONifiable):
    """
    DTO containing a list of phenotypes.
    """
    phenotypes = attr.ib(validator=attr.validators.deep_iterable(member_validator=instance_of(str),
                                                                 iterable_validator=instance_of(typing.List)))

    def json_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__


class ColocalizationDB:


    @abc.abstractmethod
    def get_phenotype(self) -> PhenotypeList:
        """
        Return a list of phenotypes (phenotype1)
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_locus(self,
                  phenotype: str,
                  locus: Locus,
                  flags: typing.Dict[str, typing.Any]) -> SearchResults:
        """
        Search for colocalization that match
        phenotype and range and return them.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection of optional flags

        :return: matching colocalizations
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_finemapping(self,
                        phenotype: str,
                        locus: Locus,
                        flags: typing.Dict[str, typing.Any]={}) -> typing.List[CausalVariant]:
        None
    
    @abc.abstractmethod
    def get_variant(self,
                    phenotype: str,
                    variant: Variant,
                    flags: typing.Dict[str, typing.Any]) -> SearchResults:
        """
        Search for colocalization that match
        phenotype and range a summary of matches.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection of optional flags

        :return: summary of matching colocalizations
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_locus_summary(self,
                          phenotype: str,
                          locus: Locus,
                          flags: typing.Dict[str, typing.Any] = {}) -> SearchSummary:
        raise NotImplementedError

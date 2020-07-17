import abc
import attr
import typing
import attr
from attr.validators import instance_of
#from ..data_access.db import JSONifiable
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
    return lambda value : None if value == 'NA' or value == 'na' else f(value)
    
def ascii(value: str) -> str:
    return value
#    return "".join(char for char in value if ord(char) < 128)

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
class ChromosomePosition(Kwargs, JSONifiable):
    """
    # TODO what is the right term for this object

    DTO containing the chromosome position with

    """
    chromosome = attr.ib(validator=instance_of(str))
    position = attr.ib(validator=instance_of(int))
    reference = attr.ib(validator=instance_of(str))
    alternate = attr.ib(validator=instance_of(str))

    @staticmethod
    def from_str(text: str) -> typing.Optional["ChromosomePosition"]:
        # TODO what are the valid letters that go here
        #fragments = re.match(r'chr(?P<chromosome>[A-Za-z0-9]+)_(?P<position>\d+)_(?P<reference>[A-Za-z]+)_(?P<alternate>[A-Za-z]+)', text)
        fragments = re.match(r'^chr(?P<chromosome>[A-Za-z0-9]+)_(?P<position>\d+)_(?P<reference>[A-Za-z]+)_(?P<alternate>.+)$', text)
        if fragments is None:
            None
        else:
            return ChromosomePosition(chromosome=fragments.group('chromosome'),
                                      position=int(fragments.group('position')),
                                      reference=fragments.group('reference'),
                                      alternate=fragments.group('alternate'))

    def to_str(self) -> str:
        return "chr{chromosome}_{position}_{reference}_{alternate}".format(chromosome=self.chromosome,
                                                                           position=self.position,
                                                                           reference=self.reference,
                                                                           alternate=self.alternate)

    def json_rep(self):
        return self.__dict__

    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    def __composite_values__(self):
        """
        These are artifacts needed for composition by sqlalchemy.
        Returns a tuple containing the constructor args.

        :return: tuple (chromosome, position, reference, alternate)
        """
        return self.chromosome, self.position, self.reference, self.alternate

# Locus
@attr.s
class ChromosomeRange(JSONifiable, Kwargs):
    """
        Chromosome coordinate range
        # TODO what is the right term for this object

        chromosome: chromosome
        start: start of range
        stop: end of range
    """
    chromosome = attr.ib(validator=instance_of(str))
    start = attr.ib(validator=instance_of(int))
    stop = attr.ib(validator=instance_of(int))

    @staticmethod
    def from_str(text: str) -> typing.Optional["ChromosomeRange"]:
        """
        Takes a string representing a range and returns a tuple of integers
        (chromosome,start,stop).  Returns None if it cannot be parsed.
        """
        fragments = re.match(r'(?P<chromosome>[A-Za-z0-9]+):(?P<start>\d+)-(?P<stop>\d+)', text)
        if fragments is None:
            return None
        else:
            return ChromosomeRange(chromosome=fragments.group('chromosome'),
                                   start=int(fragments.group('start')),
                                   stop=int(fragments.group('stop')))

    def to_str(self):
        """

        :return: string representation of range
        """
        return "{chromosome}:{start}-{stop}".format(chromosome=self.chromosome,
                                                    start=self.start,
                                                    stop=self.stop)

    def json_rep(self):
        return self.__dict__

    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    def __composite_values__(self):
        """
        These are artifacts needed for composition by sqlalchemy.
        Returns a tuple containing the constructor args.

        :return: tuple (chromosome, start, stop)
        """
        return self.chromosome, self.start, self.stop


@attr.s
class Colocalization(Kwargs, JSONifiable):
    """
    DTO for colocalization.

    https://github.com/FINNGEN/colocalization/blob/master/docs/data_dictionary.txt

    Note : the column order is defined here.  This column order determines
    how data is loaded.

    """
    source1 = attr.ib(validator=instance_of(str))
    source2 = attr.ib(validator=instance_of(str))
    phenotype1 = attr.ib(validator=instance_of(str))
    phenotype1_description = attr.ib(validator=instance_of(str))
    phenotype2 = attr.ib(validator=instance_of(str))
    phenotype2_description = attr.ib(validator=instance_of(str))
    tissue1 = attr.ib(validator=attr.validators.optional(instance_of(str)))
    tissue2 = attr.ib(validator=instance_of(str))
    locus_id1 = attr.ib(validator=instance_of(ChromosomePosition))
    locus_id2 = attr.ib(validator=instance_of(ChromosomePosition))
    chromosome = attr.ib(validator=instance_of(str))
    start = attr.ib(validator=instance_of(int))
    stop = attr.ib(validator=instance_of(int))
    clpp = attr.ib(validator=instance_of(float))
    clpa = attr.ib(validator=instance_of(float))
    beta_id1 = attr.ib(validator=attr.validators.optional(instance_of(float)))
    beta_id2 = attr.ib(validator=attr.validators.optional(instance_of(float)))
    variation = attr.ib(validator=instance_of(str))
    vars_pip1 = attr.ib(validator=instance_of(str))
    vars_pip2 = attr.ib(validator=instance_of(str))
    vars_beta1 = attr.ib(validator=instance_of(str))
    vars_beta2 = attr.ib(validator=instance_of(str))
    len_cs1 = attr.ib(validator=instance_of(int))
    len_cs2 = attr.ib(validator=instance_of(int))
    len_inter = attr.ib(validator=instance_of(int))

    def kwargs_rep(self) -> typing.Dict[str, typing.Any]:
        return self.__dict__

    def json_rep(self):
        d = self.__dict__
        d["locus_id1"] = d["locus_id1"].to_str()
        d["locus_id2"] = d["locus_id2"].to_str()
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
                                        locus_id1=nvl(line[8], ChromosomePosition.from_str),
                                        locus_id2=nvl(line[9], ChromosomePosition.from_str),

                                        chromosome=nvl(line[10], str),
                                        start=nvl(line[11], na(int)),
                                        stop=nvl(line[12], na(int)),

                                        clpp=nvl(line[13], float),
                                        clpa=nvl(line[14], float),
                                        beta_id1=nvl(line[15], na(float)),
                                        beta_id2=nvl(line[16], na(float)),

                                        variation=nvl(line[17], str),
                                        vars_pip1=nvl(line[18], str),
                                        vars_pip2=nvl(line[19], str),
                                        vars_beta1=nvl(line[20], str),
                                        vars_beta2=nvl(line[21], str),
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
    def get_phenotype_range(self,
                            phenotype: str,
                            chromosome_range: ChromosomeRange,
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
    def get_phenotype_range_summary(self,
                                    phenotype: str,
                                    chromosome_range: ChromosomeRange,
                                    flags: typing.Dict[str, typing.Any]) -> SearchSummary:
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
    def get_locus(self,
                  phenotype: str,
                  locus: ChromosomePosition,
                  flags: typing.Dict[str, typing.Any]) -> SearchResults:
        raise NotImplementedError

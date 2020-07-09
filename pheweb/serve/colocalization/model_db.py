import typing
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker
from .model import Colocalization, ColocalizationDB, SearchSummary, ChromosomeRange, SearchResults, PhenotypeList
from .model import ChromosomePosition
import csv
import gzip
from sqlalchemy.orm import mapper, composite
import attr
from .dao_support import DAOSupport
from sqlalchemy import func, distinct

metadata = MetaData()
colocalization_table = Table('colocalization',
                             metadata,
                             Column('source1', String(80), unique=False, nullable=False, primary_key=True),
                             Column('source2', String(80), unique=False, nullable=False, primary_key=True),
                             Column('phenotype1', String(80), unique=False, nullable=False, primary_key=True),
                             Column('phenotype1_description', String(80), unique=False, nullable=False),
                             Column('phenotype2', String(80), unique=False, nullable=False, primary_key=True),
                             Column('phenotype2_description', String(80), unique=False, nullable=False),
                             Column('tissue1', String(80), unique=False, nullable=True, primary_key=True),
                             Column('tissue2', String(80), unique=False, nullable=False, primary_key=True),

                             # locus_id1
                             Column('locus_id1_chromosome', String(2), unique=False, nullable=False, primary_key=True),
                             Column('locus_id1_position', Integer, unique=False, nullable=False, primary_key=True),
                             Column('locus_id1_ref', String(1), unique=False, nullable=False, primary_key=True),
                             Column('locus_id1_alt', String(1), unique=False, nullable=False, primary_key=True),

                             # locus_id2
                             Column('locus_id2_chromosome', String(2), unique=False, nullable=False, primary_key=True),
                             Column('locus_id2_position', Integer, unique=False, nullable=False, primary_key=True),
                             Column('locus_id2_ref', String(1), unique=False, nullable=False, primary_key=True),
                             Column('locus_id2_alt', String(1), unique=False, nullable=False, primary_key=True),

                             Column('chromosome',  String(2), unique=False, nullable=False),
                             Column('start', Integer, unique=False, nullable=False),
                             Column('stop', Integer, unique=False, nullable=False),

                             Column('clpp', Float, unique=False, nullable=False),
                             Column('clpa', Float, unique=False, nullable=False),
                             Column('beta_id1', Float, unique=False, nullable=False),
                             Column('beta_id2', Float, unique=False, nullable=False),

                             Column('variation', String(80), unique=False, nullable=False),
                             Column('vars_pip1', String(80), unique=False, nullable=False),
                             Column('vars_pip2', String(80), unique=False, nullable=False),
                             Column('vars_beta1', String(80), unique=False, nullable=False),
                             Column('vars_beta2', String(80), unique=False, nullable=False),
                             Column('len_cs1', Integer, unique=False, nullable=False),
                             Column('len_cs2', Integer, unique=False, nullable=False),
                             Column('len_inter', Integer, unique=False, nullable=False))




@attr.s
class ColocalizationDTO(Colocalization):
    """
    The mapper adds persistence state attributes
    to the the class to avoid this problem we use
    the DTO subclass.  We have to change the
    json method
    """
    def json_rep(self) -> typing.Dict[str, typing.Any]:
        return {x: getattr(self, x) for x in Colocalization.column_names()}

    def to_colocalization(self) -> Colocalization:
        return Colocalization(**self.json_rep())


cluster_coordinate_mapper = mapper(ColocalizationDTO,
                                   colocalization_table,
                                   properties={'locus_id1': composite(ChromosomePosition,
                                                                      colocalization_table.c.locus_id1_chromosome,
                                                                      colocalization_table.c.locus_id1_position,
                                                                      colocalization_table.c.locus_id1_ref,
                                                                      colocalization_table.c.locus_id1_alt),
                                               'locus_id2': composite(ChromosomePosition,
                                                                      colocalization_table.c.locus_id2_chromosome,
                                                                      colocalization_table.c.locus_id2_position,
                                                                      colocalization_table.c.locus_id2_ref,
                                                                      colocalization_table.c.locus_id2_alt)}
                                   )


def create_filter(clazz, flags: typing.Dict[str, typing.Any]):
    # .limit
    # field.order_by
    #
    None

class ColocalizationDAO(ColocalizationDB):

    def __init__(self, db_url: str, parameters={}):
        print("ColocalizationDAO : {}".format(db_url))
        self.engine = create_engine(db_url, **parameters)
        metadata.bind = self.engine
        self.Session = sessionmaker(bind=self.engine)
        self.support = DAOSupport(ColocalizationDTO)

    def __del__(self):
        self.engine.dispose()

    def create_schema(self):
        metadata.create_all(self.engine)

    def load_data(self, path: str) -> typing.Optional[int]:
        with gzip.open(path, "rt") if path.endswith("gz") else open(path, 'r') as csv_file:
            reader = csv.reader(csv_file, delimiter='\t', )
            # The names in the header are abbreviated,
            # and do not match the attribute names in
            # colocalization.  So they must be specified.
            #
            # expected_header = Colocalization.column_names()
            expected_header = ['source1', 'source2', 'pheno1', 'pheno1_description', 'pheno2', 'pheno2_description',
                               'tissue1', 'tissue2', 'locus_id1', 'locus_id2', 'chrom', 'start', 'stop', 'clpp',
                               'clpa', 'beta_id1', 'beta_id2', 'vars', 'vars_pip1', 'vars_pip2', 'vars_beta1',
                               'vars_beta2', 'len_cs1', 'len_cs2', 'len_inter']

            actual_header = next(reader)
            count = 0
            assert expected_header == actual_header, \
                "header expected '{expected_header}' got '{actual_header}'".format(expected_header=expected_header,
                                                                                   actual_header=actual_header)
            session = self.Session()
            for line in reader:
                count = count + 1
                dto = ColocalizationDTO(**Colocalization.from_list(line).kwargs_rep())
                session.add(dto)
            session.commit()
            return count


    def get_phenotype(self,
                      flags: typing.Dict[str, typing.Any]={}) -> typing.List[str]:
        session = self.Session()
        q = session.query(distinct(ColocalizationDTO.phenotype1))
        matches = self.support.create_filter(q, flags)
        return PhenotypeList(phenotypes = [r[0] for r in q.all()])
        return phenotype1


    def get_phenotype_range(self,
                            phenotype: str,
                            chromosome_range: ChromosomeRange,
                            flags: typing.Dict[str, typing.Any]={}) -> SearchResults:
        """
        Search for colocalization that match
        phenotype and range and return them.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection of optional flags

        :return: matching colocalizations
        """
        session = self.Session()
        matches = self.support.query_matches(session,
                                             flags={**{"phenotype1": phenotype,
                                                       "locus_id1_chromosome": chromosome_range.chromosome,
                                                       "locus_id1_position.gte": chromosome_range.start,
                                                       "locus_id1_position.lte": chromosome_range.stop}},
                                             f=lambda x: x.to_colocalization())
        return SearchResults(colocalizations=matches,
                             count=len(matches))

    def get_locus(self,
                  phenotype: str,
                  locus: ChromosomePosition,
                  flags: typing.Dict[str, typing.Any] = {}) -> SearchResults:
        session = self.Session()
        raise NotImplementedError


    def get_phenotype_range_summary(self,
                                    phenotype: str,
                                    chromosome_range: ChromosomeRange,
                                    flags: typing.Dict[str, typing.Any] = {}) -> SearchSummary:
        session = self.Session()
        flags = {**{"phenotype1": phenotype,
                    "locus_id1_chromosome": chromosome_range.chromosome,
                    "locus_id1_position.gte": chromosome_range.start,
                    "locus_id1_position.lte": chromosome_range.stop}}
        _, count = self.support.create_filter(session.query(self.support.clazz), flags=flags)
        count = count.count()
        unique_phenotype2 = session.query(func.count(func.distinct(getattr(self.support.clazz, "phenotype2"))))
        warnings, unique_phenotype2 = self.support.create_filter(unique_phenotype2, flags=flags)
        unique_phenotype2 = unique_phenotype2.scalar()
        unique_tissue2 = session.query(func.count(func.distinct(getattr(self.support.clazz, "tissue2"))))
        warnings, unique_tissue2 = self.support.create_filter(unique_tissue2, flags=flags)
        unique_tissue2 = unique_tissue2.scalar()

        return SearchSummary(count=count,
                             unique_phenotype2 = unique_phenotype2,
                             unique_tissue2 = unique_tissue2)

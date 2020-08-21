import typing
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import sessionmaker
from .model import Colocalization, CasualVariant, ColocalizationDB, SearchSummary, Locus, SearchResults, PhenotypeList, Variant
import csv
import gzip
from sqlalchemy.orm import mapper, composite, relationship
import attr
from .dao_support import DAOSupport
from sqlalchemy import func, distinct, or_, and_
import os
import sys
import importlib.machinery
import importlib.util

# TODO remove
csv.field_size_limit(sys.maxsize)

metadata = MetaData()

casual_variant_table = Table('casual_variant',
                             metadata,
                             Column('id', Integer, primary_key=True, autoincrement=True),
                             Column('pip1', Float, unique=False, nullable=False),
                             Column('pip2', Float, unique=False, nullable=False),
                             Column('beta1', Float, unique=False, nullable=False),
                             Column('beta2', Float, unique=False, nullable=False),
                             *Variant.columns('variation_'),
                             Column('colocalization_id', Integer, ForeignKey('colocalization.id'), primary_key=False))

colocalization_table = Table('colocalization',
                             metadata,
                             Column('id', Integer, primary_key=True, autoincrement=True),
                             Column('source1', String(80), unique=False, nullable=False), #primary_key=True),
                             Column('source2', String(80), unique=False, nullable=False), #primary_key=True),
                             Column('phenotype1', String(1000), unique=False, nullable=False), #primary_key=True),
                             Column('phenotype1_description', String(1000), unique=False, nullable=False),
                             Column('phenotype2', String(1000), unique=False, nullable=False), #primary_key=True),
                             Column('phenotype2_description', String(1000), unique=False, nullable=False),
                             Column('tissue1', String(80), unique=False, nullable=True), #primary_key=True),
                             Column('tissue2', String(80), unique=False, nullable=False), #primary_key=True),

                             # locus_id1
                             *Variant.columns('locus_id1_'),
                             # locus_id2
                             *Variant.columns('locus_id2_'),

                             # locus
                             *Locus.columns(''),

                             Column('clpp', Float, unique=False, nullable=False),
                             Column('clpa', Float, unique=False, nullable=False),
                             Column('beta_id1', Float, unique=False, nullable=True),
                             Column('beta_id2', Float, unique=False, nullable=True),

                             Column('len_cs1', Integer, unique=False, nullable=False),
                             Column('len_cs2', Integer, unique=False, nullable=False),
                             Column('len_inter', Integer, unique=False, nullable=False))

def refine_colocalization(c : Colocalization) -> Colocalization:
    c = {x: getattr(c, x) for x in Colocalization.column_names()}
    return Colocalization(**c)


casual_variant_mapper = mapper(CasualVariant,
                               casual_variant_table,
                               properties = { 'variant': composite(Variant,
                                                                   casual_variant_table.c.variation_chromosome,
                                                                   casual_variant_table.c.variation_position,
                                                                   casual_variant_table.c.variation_ref,
                                                                   casual_variant_table.c.variation_alt)
                                            })

cluster_coordinate_mapper = mapper(Colocalization,
                                   colocalization_table,
                                   properties={'locus_id1': composite(Variant,
                                                                      colocalization_table.c.locus_id1_chromosome,
                                                                      colocalization_table.c.locus_id1_position,
                                                                      colocalization_table.c.locus_id1_ref,
                                                                      colocalization_table.c.locus_id1_alt),
                                               'locus_id2': composite(Variant,
                                                                      colocalization_table.c.locus_id2_chromosome,
                                                                      colocalization_table.c.locus_id2_position,
                                                                      colocalization_table.c.locus_id2_ref,
                                                                      colocalization_table.c.locus_id2_alt),
                                               
                                               'locus': composite(Locus,
                                                                  colocalization_table.c.chromosome,
                                                                  colocalization_table.c.start,
                                                                  colocalization_table.c.stop),

                                               'variants_1': relationship(CasualVariant,
                                                                          cascade='all, delete-orphan'),

                                               'variants_2': relationship(CasualVariant,
                                                                          cascade='all, delete-orphan'),

                                   }
)


class ColocalizationDAO(ColocalizationDB):
    @staticmethod
    def mysql_config(path : str) -> typing.Optional[str] :
        if os.path.exists(path):
            loader = importlib.machinery.SourceFileLoader('auth_module',path)
            spec = importlib.util.spec_from_loader(loader.name, loader)
            auth_module = importlib.util.module_from_spec(spec)
            loader.exec_module(auth_module)

            user = getattr(auth_module, 'mysql')['user']
            password = getattr(auth_module, 'mysql')['password']
            host = getattr(auth_module, 'mysql')['host']
            db = getattr(auth_module, 'mysql')['db']
            return 'mysql://{}:{}@{}/{}'.format(user,password,host,db)
        else:
            return path
    
    def __init__(self, db_url: str, parameters=dict()):
        self.db_url=ColocalizationDAO.mysql_config(db_url)
        print("ColocalizationDAO : {}".format(self.db_url))
        self.engine = create_engine(self.db_url,
                                    pool_pre_ping=True,
                                    *parameters)
        metadata.bind = self.engine
        self.Session = sessionmaker(bind=self.engine)
        self.support = DAOSupport(Colocalization)
    
    def __del__(self):
        if hasattr(self, 'engine') and self.engine:
            self.engine.dispose()
    
    def create_schema(self):
        return metadata.create_all(self.engine)
    
    def dump(self):
        print(self.db_url)
        # see  : https://stackoverflow.com/questions/2128717/sqlalchemy-printing-raw-sql-from-create
        def metadata_dump(sql, *multiparams, **params):
            print(sql.compile(dialect=engine.dialect))
        engine = create_engine(self.db_url, strategy='mock', executor=metadata_dump)
        metadata.create_all(engine)
            
    def delete_all(self):
        self.engine.execute(colocalization_table.delete())
        metadata.drop_all(self.engine) 
    
    def load_data(self, path: str, header : bool=True) -> typing.Optional[int]:
        count = 0
        def generate_colocalization():
            with gzip.open(path, "rt") if path.endswith("gz") else open(path, 'r') as csv_file:
                reader = csv.reader(csv_file, delimiter='\t', )
                expected_header = Colocalization.column_names()
                expected_header = ['source1', 'source2', 'pheno1', 'pheno1_description', 'pheno2', 'pheno2_description',
                                   'tissue1', 'tissue2', 'locus_id1', 'locus_id2', 'chrom', 'start', 'stop', 'clpp',
                                   'clpa', 'beta_id1', 'beta_id2', 'vars', 'vars_pip1', 'vars_pip2', 'vars_beta1',
                                   'vars_beta2', 'len_cs1', 'len_cs2', 'len_inter']


                if header:
                    actual_header = next(reader)
                    assert expected_header == actual_header, \
                        "header expected '{expected_header}' got '{actual_header}'".format(expected_header=expected_header,
                                                                                           actual_header=actual_header)
                
                for line in reader:
                    #count = count + 1
                    try:
                        dto = Colocalization.from_list(line)
                        yield dto
                    except Exception as e:
                        print(e)
                        print(dto)
                        print("file:{}".format(path), file=sys.stderr, flush=True)
                        print("line:{}".format(count), file=sys.stderr, flush=True)
                        print(line, file=sys.stderr, flush=True)
                        raise
                    
        session = self.Session()
        session.bulk_save_objects(generate_colocalization())
        session.commit()
        return count

    def save(self,colocalization : Colocalization) -> None:
        session = self.Session()
        session.add(colocalization)
        session.commit()

    def get_phenotype(self,
                      flags: typing.Dict[str, typing.Any]={}) -> typing.List[str]:
        session = self.Session()
        q = session.query(distinct(Colocalization.phenotype1))
        matches = self.support.create_filter(q, flags)
        return PhenotypeList(phenotypes = [r[0] for r in q.all()])
        return phenotype1


    def get_locus(self,
                  phenotype: str,
                  locus: Locus,
                  flags: typing.Dict[str, typing.Any]={}) -> SearchResults:
        """
        Search for colocalization that match
        the locus and range and return them.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection of optional flags

        :return: matching colocalizations
        """
        session = self.Session()
        matches = self.support.query_matches(session,
                                             flags={**{"phenotype1": phenotype,
                                                       "locus_id1_chromosome": locus.chromosome,
                                                       "locus_id1_position.gte": locus.start,
                                                       "locus_id1_position.lte": locus.stop},**flags},
                                             f=refine_colocalization)
        return SearchResults(colocalizations=matches,
                             count=len(matches))

    def get_colocalizations(self,
                           phenotype: str,
                           locus: Locus,
                           flags: typing.Dict[str, typing.Any] = {}) -> SearchResults:
        locus_id1 = Colocalization.variants_1.any(and_(CasualVariant.variation_chromosome == locus.chromosome,
                                                       CasualVariant.variation_position >= locus.start,
                                                       CasualVariant.variation_position <= locus.stop))
        
        locus_id2 = Colocalization.variants_2.any(and_(CasualVariant.variation_chromosome == locus.chromosome,
                                                       CasualVariant.variation_position >= locus.start,
                                                       CasualVariant.variation_position <= locus.stop))
        
        matches = self.Session().query(Colocalization).filter(or_(locus_id1, locus_id2)).all()
        return SearchResults(colocalizations=matches,
                             count=len(matches))
        
    def get_variant(self,
                    phenotype: str,
                    variant: Variant,
                    flags: typing.Dict[str, typing.Any] = {}) -> SearchResults:
        session = self.Session()
        matches = self.support.query_matches(session,
                                             flags={**{"phenotype1": phenotype,
                                                       "locus_id1_chromosome": variant.chromosome,
                                                       "locus_id1_position": variant.position,
                                                       "locus_id1_reference": variant.reference,
                                                       "locus_id1_alternate": variant.alternate,
                                             },**flags},
                                             f=refine_colocalization)
        return SearchResults(colocalizations=matches,
                             count=len(matches))


    def get_locus_summary(self,
                          phenotype: str,
                          locus: Locus,
                          flags: typing.Dict[str, typing.Any] = {}) -> SearchSummary:
        session = self.Session()
        flags = {**{"phenotype1": phenotype,
                    "locus_id1_chromosome": locus.chromosome,
                    "locus_id1_position.gte": locus.start,
                    "locus_id1_position.lte": locus.stop},**flags}
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

import typing
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float, Text, ForeignKey, Index
from sqlalchemy.orm import sessionmaker
from .model import Colocalization, CausalVariant, ColocalizationDB, SearchSummary, Locus, SearchResults, PhenotypeList, Variant, ColocalizationMap, CausalVariantVector
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
from sqlalchemy.sql import func

# TODO remove
csv.field_size_limit(sys.maxsize)

metadata = MetaData()

causal_variant_table = Table('causal_variant',
                             metadata,
                             Column('id', Integer, primary_key=True, autoincrement=True),
                             Column('pip1', Float, unique=False, nullable=True),
                             Column('pip2', Float, unique=False, nullable=True),
                             Column('beta1', Float, unique=False, nullable=True),
                             Column('beta2', Float, unique=False, nullable=True),
                             *Variant.columns('variant1_', nullable=True),
                             *Variant.columns('variant2_', nullable=True),
                             Column('colocalization_id', Integer, ForeignKey('colocalization.id')))

colocalization_table = Table('colocalization',
                             metadata,
                             Column('id', Integer, primary_key=True, autoincrement=True),
                             Column('source1', String(80), unique=False, nullable=False),
                             Column('source2', String(80), unique=False, nullable=False),
                             Column('phenotype1', String(1000), unique=False, nullable=False),
                             Column('phenotype1_description', String(1000), unique=False, nullable=False),
                             Column('phenotype2', String(1000), unique=False, nullable=False),
                             Column('phenotype2_description', String(1000), unique=False),
                             Column('tissue1', String(80), unique=False, nullable=True),
                             Column('tissue2', String(80), unique=False, nullable=False),

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

def NullableVariant(chromosome : typing.Optional[str],
                    position : typing.Optional[int],
                    reference : typing.Optional[str],
                    alternate : typing.Optional[str]) -> typing.Optional[Variant] :
    if chromosome and position and reference and alternate:
        return Variant(chromosome, position, reference, alternate)
    else:
        return None
        
causal_variant_mapper = mapper(CausalVariant,
                               causal_variant_table,
                               properties = { 'variant1': composite(NullableVariant,
                                                                   causal_variant_table.c.variant1_chromosome,
                                                                   causal_variant_table.c.variant1_position,
                                                                   causal_variant_table.c.variant1_ref,
                                                                   causal_variant_table.c.variant1_alt)
                                            , 'variant2': composite(NullableVariant,
                                                                     causal_variant_table.c.variant2_chromosome,
                                                                     causal_variant_table.c.variant2_position,
                                                                     causal_variant_table.c.variant2_ref,
                                                                     causal_variant_table.c.variant2_alt)
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

                                               'variants': relationship(CausalVariant),
                                   }
)


class ColocalizationDAO(ColocalizationDB):
    @staticmethod
    def mysql_config(path : str) -> typing.Optional[str] :
        print(path)
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
                        print(line)
                        print(e)
                        print("file:{}".format(path), file=sys.stderr, flush=True)
                        print("line:{}".format(count), file=sys.stderr, flush=True)
                        print(line, file=sys.stderr, flush=True)
                        raise

        session = self.Session()
        for c in generate_colocalization():
            print('.',flush=True,sep='')
            self.save(c)
            c = None

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

    def locus_query(self,
                    phenotype: str,
                    locus: Locus,
                    flags: typing.Dict[str, typing.Any]={},
                    projection = [Colocalization]):
        locus_id1 = Colocalization.variants.any(and_(CausalVariant.variant1_chromosome == locus.chromosome,
                                                     CausalVariant.variant1_position >= locus.start,
                                                     CausalVariant.variant1_position <= locus.stop))

        locus_id2 = Colocalization.variants.any(and_(CausalVariant.variant2_chromosome == locus.chromosome,
                                                     CausalVariant.variant2_position >= locus.start,
                                                     CausalVariant.variant2_position <= locus.stop))
        session = self.Session()
        return [session,session.query(*projection).select_from(Colocalization).filter(or_(locus_id1, locus_id2))]

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
        [session,query] = self.locus_query(phenotype, locus, flags)
        matches = query.all()
        session.expire_all()
        return SearchResults(colocalizations=matches,
                             count=len(matches))

    def get_locuszoom(self,
                        phenotype: str,
                        locus: Locus,
                        flags: typing.Dict[str, typing.Any]={}) -> typing.Dict[str, CausalVariantVector]   :
        """
        Search for colocalization that match
        the locus and range and return them.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection of optional flags

        :return: matching colocalizations
        """
        [session,query] = self.locus_query(phenotype, locus, flags)
        session.expire_all()
        rows = {}
        for r in query.all():
            variants = map(lambda r : r.json_rep(), r.variants)
            variants = map(lambda v: [v["position1"],
                                      v["position2"],
                                      v["variant1"],
                                      v["variant2"],
                                      v["pip1"],
                                      v["pip2"],
                                      v["beta1"],
                                      v["beta2"],
                                      v["id"],
                                      v["rsid1"],
                                      v["rsid2"],
                                      v["varid1"],
                                      v["varid2"],
                                      v["count_variants"],
                                      r.phenotype1,
                                      r.phenotype1_description,
                                      r.phenotype2,
                                      r.phenotype2_description
                                    ], variants)
            variants = list(map(list,zip(*variants)))
            if variants:
                position1 = variants[0]
                position2 = variants[1]
                variant1 = variants[2]
                variant2 = variants[3]
                pip1 = variants[4]
                pip2 = variants[5]
                beta1 = variants[6]
                beta2 = variants[7]
                causalvariantid = variants[8]
                rsid1 = variants[9]
                rsid2 = variants[10]
                varid1 = variants[11]
                varid2 = variants[12]
                count_variants = variants[13]
                phenotype1 = variants[14]
                phenotype1_description = variants[15]
                phenotype2 = variants[16]
                phenotype2_description = variants[17]
            else:
                position1 = []
                position2 = []
                variant1 = []
                variant2 = []
                pip1 = []
                pip2 = []
                beta1 = []
                beta2 = []
                causalvariantid = []
                rsid1 = []
                rsid2 = []
                varid1 = []
                varid2 = []
                count_variants = []
                phenotype1 = []
                phenotype1_description = []
                phenotype2 = []
                phenotype2_description = []
                
            rows[r.id] = CausalVariantVector(position1,
                                             position2,
                                             variant1,
                                             variant2,
                                             pip1,
                                             pip2,
                                             beta1,
                                             beta2,
                                             causalvariantid,
                                             rsid1,
                                             rsid2,
                                             varid1,
                                             varid2,
                                             count_variants,
                                             phenotype1,
                                             phenotype1_description,
                                             phenotype2,
                                             phenotype2_description)




        return rows
    
    def get_locus_summary(self,
                          phenotype: str,
                          locus: Locus,
                          flags: typing.Dict[str, typing.Any] = {}) -> SearchSummary:
        aggregates =  [func.count('*'),
                       func.count(distinct('colocalization.phenotype1')),
                       func.count(distinct('colocalization.phenotype2'))]
        [session,query] = self.locus_query(phenotype, locus, flags, aggregates)
        session.expire_all()
        count, unique_phenotype2, unique_tissue2 = query.all()[0]
        return SearchSummary(count=count,
                             unique_phenotype2 = unique_phenotype2,
                             unique_tissue2 = unique_tissue2)

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
        
    def get_colocalization(self,
                           colocalization_id : int,
                           flags: typing.Dict[str, typing.Any] = dict()) -> typing.Optional[Colocalization]:
        session = self.Session()
        matches = session.query(Colocalization).filter(Colocalization.id == colocalization_id).one_or_none()
        return matches


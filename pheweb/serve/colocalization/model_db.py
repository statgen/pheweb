    import typing
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float, Text, ForeignKey, Index
from sqlalchemy.orm import sessionmaker
from .model import ColocalizationDB, SearchSummary, SearchResults, PhenotypeList, CausalVariantVector
from .model_mapper import create_metadata
from finngen_common_data_model.genomics import Variant, Locus
from finngen_common_data_model.colocalization import CausalVariant, Colocalization 

import csv
import gzip
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

class ColocalizationDAO(ColocalizationDB):
    metadata = None
    @staticmethod
    def getMetaData():
        if not ColocalizationDAO.metadata:
            ColocalizationDAO.metadata = create_metadata()
        return ColocalizationDAO.metadata

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
                                    echo=True,
                                    *parameters)

        ColocalizationDAO.getMetaData().bind = self.engine
        self.Session = sessionmaker(bind=self.engine)
        self.support = DAOSupport(Colocalization)

    def __del__(self):
        if hasattr(self, 'engine') and self.engine:
            self.engine.dispose()

    def create_schema(self):
        return ColocalizationDAO.getMetaData().create_all(self.engine)

    def dump(self):
        print(self.db_url)
        # see  : https://stackoverflow.com/questions/2128717/sqlalchemy-printing-raw-sql-from-create
        def metadata_dump(sql, *multiparams, **params):
            print(sql.compile(dialect=engine.dialect))
        engine = create_engine(self.db_url, strategy='mock', executor=metadata_dump)
        ColocalizationDAO.getMetaData().create_all(engine)

    def delete_all(self):
        self.engine.execute(colocalization_table.delete())
        ColocalizationDAO.getMetaData().drop_all(self.engine)


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
            print('.', flush=True, end='')
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

        colocalization_filter = and_(Colocalization.phenotype1 == phenotype,
                                     Colocalization.chromosome == locus.chromosome)
        phenotype1 = Colocalization.phenotype1 == phenotype
        session = self.Session()
        return [session, session
                         .query(*projection)
                         .select_from(Colocalization)
                         .filter(or_(locus_id1, locus_id2))
                         .filter(colocalization_filter) ]

    def get_locus(self,
                  phenotype: str,
                  locus: Locus,
                  flags: typing.Dict[str, typing.Any]={}) -> SearchResults:
        """
        Search for colocalization that match
        the locus and range and return them.

        :param phenotype: phenotype to match in search
        :param chromosome_range: chromosome range to search
        :param flags: a collection   of optional flags

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
                count_variants = variants[9]
                phenotype1 = variants[10]
                phenotype1_description = variants[11]
                phenotype2 = variants[12]
                phenotype2_description = variants[13]
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
                       func.count(distinct('colocalization.phenotype2')),
                       func.count(distinct('colocalization.tissue2'))]
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


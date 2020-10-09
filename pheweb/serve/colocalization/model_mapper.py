import typing
from sqlalchemy import Table, MetaData, create_engine, Column, Integer, String, Float, Text, ForeignKey, Index
from sqlalchemy.orm import mapper, composite, relationship
from .model import ColocalizationDB, SearchSummary, SearchResults, PhenotypeList, CausalVariantVector
from finngen_common_data_model.genomics import Variant, Locus
from finngen_common_data_model.colocalization import CausalVariant, Colocalization

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

def create_metadata():
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

    causal_variant1_chromosome_position = Index('causal_variant1_chromosome_position',
                                                causal_variant_table.c.variant1_chromosome,
                                                causal_variant_table.c.variant1_position)

    causal_variant2_chromosome_position = Index('causal_variant2_chromosome_position',
                                                causal_variant_table.c.variant2_chromosome,
                                                causal_variant_table.c.variant2_position)

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



    colocalization_phenotype1 = Index('colocalization_phenotype1',
                                      colocalization_table.c.phenotype1)

    colocalization_phenotype1 = Index('colocalization_phenotype1',
                                      colocalization_table.c.phenotype1)
    colocalization_phenotype2 = Index('colocalization_phenotype2',
                                      colocalization_table.c.phenotype2)

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

    return metadata
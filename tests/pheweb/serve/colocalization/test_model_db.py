from pheweb.serve.colocalization.model import Variant, CasualVariant, Locus, Colocalization
from pheweb.serve.colocalization.model_db import ColocalizationDAO

def test_can_insert():
    dao = ColocalizationDAO('sqlite:///:memory:')
    dao.create_schema()
    phenotype1 = "phenotype1"
    
    variants = [CasualVariant(variant = Variant.from_str("chr5_2_A_C"),
                              pip1 = 1.0,
                              pip2 = 2.0,
                              beta1 = 3.0,
                              beta2 = 4.0),
                CasualVariant(variant = Variant.from_str("chr10_2_G_T"),
                              pip1 = 6.0,
                              pip2 = 7.0,
                              beta1 = 8.0,
                              beta2 = 9.0)]
    colocalization = Colocalization(source1 = "source1",
                                    source2 = "source2",
                                    phenotype1 = phenotype1,
                                    phenotype1_description = "phenotype1_description",
                                    phenotype2 = "phenotype2",
                                    phenotype2_description = "phenotype2_description",
                                    tissue1 = "tissue1",
                                    tissue2 = "tissue2",
                                    locus_id1 = Variant.from_str("chr1_2_A_C"),
                                    locus_id2 = Variant.from_str("chr3_4_G_T"),
                                    chromosome = "7",
                                    start = 8,
                                    stop = 9,
                                    clpp = 10.0,
                                    clpa = 11.0,
                                    
                                    beta_id1 = 12.0,
                                    beta_id2 = 13.0,
                                    
                                    variants_1 = variants,
                                    variants_2 = variants,

                                    len_cs1 = 14,
                                    len_cs2 = 15,
                                    len_inter = 16)
    
    dao.save(colocalization)
    #results = dao.get_variant(phenotype1, Variant.from_str("chr1_2_A_C"))
    results = dao.get_locus(phenotype1,
                            locus=Locus.from_str("1:2-3"),
                            flags={})
    print(results)

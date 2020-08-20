from pheweb.serve.colocalization.model import nvl, ascii, na, Variant, CasualVariant, Locus, Colocalization

def test_na():
    assert na(lambda x : x)('na') is None
    assert na(lambda x : x)('NA') is None
    assert na(lambda x : x)('a') == 'a'

def test_ascii():
    assert ascii("abc!") == "abc!"
    assert ascii("Aimée") == "Aime"
    
def test_nvl():
    assert nvl(None, id) is None
    assert nvl("", int) is None
    assert nvl("1", int) == 1

def test_variant_1():
    expected = Variant(chromosome = 1, position = 2, reference = "A", alternate = "G")
    actual = Variant.from_str("chr1_2_A_G")
    assert expected == actual
                

def test_variant_2():
    expected = "chr1_2_A_G"
    actual = str(Variant.from_str(expected))
    assert expected == actual

def test_locus_1():
    expected = Locus(chromosome = "15",start = 78464464, stop =78864464)
    actual = Locus.from_str("15:78464464-78864464")
    assert expected == actual
    
def test_locus_2():
    expected = "15:78464464-78864464"
    actual = str(Locus.from_str("15:78464464-78864464"))
    assert expected == actual

def test_causal_variant_1():
    expected = [CasualVariant(variant = Variant.from_str("chr1_2_A_G"),
                              pip1 = 0.0,
                              pip2 = 1.0,
                              beta1 = 0.0,
                              beta2 = 1.0)]
    
    variation_str = "chr1_2_A_G"    
    pip1_str = "0"
    pip2_str = "1"
    beta1_str = "0"
    beta2_str = "1"

    actual = CasualVariant.from_list(variation_str,pip1_str,pip2_str,beta1_str,beta2_str)
    assert expected == actual


def test_causal_variant_2():
    expected = [CasualVariant(variant = Variant.from_str("chr5_2_A_C"),
                              pip1 = 1.0,
                              pip2 = 2.0,
                              beta1 = 3.0,
                              beta2 = 4.0),
                CasualVariant(variant = Variant.from_str("chr10_2_G_T"),
                              pip1 = 6.0,
                              pip2 = 7.0,
                              beta1 = 8.0,
                              beta2 = 9.0)]
    variation_str = "chr5_2_A_C,chr10_2_G_T"
    pip1_str = "1.0,6.0"
    pip2_str = "2.0,7.0"
    beta1_str = "3.0,8.0"
    beta2_str = "4.0,9.0"
    actual = CasualVariant.from_list(variation_str,pip1_str,pip2_str,beta1_str,beta2_str)
    assert expected == actual

def test_colocalization():
    sample = ["source1", # source1
              "source2", # source2
              "phenotype1", # phenotype1
              "phenotype1_description", # phenotype1_description
              "phenotype2", # phenotype2
              "phenotype2_description", # phenotype2_description
              "tissue1", # tissue1
              "tissue2", # tissue2
              "chr1_2_A_C", # locus_id1
              "chr3_4_G_T", # locus_id2
              "7", # chromosome
              8, # start
              9, # stop
              10.0, # clpp
              11.0, # clpa
              12.0, # beta_id1
              13.0, # beta_id2
              "chr5_2_A_C,chr10_2_G_T", # variation
              "1.0,6.0", # vars_pip1
              "2.0,7.0", # vars_pip2
              "3.0,8.0", # vars_beta1
              "4.0,9.0", #vars_beta2 
              14, # len_cs1
              15, # len_cs2
              16, # len_inter
              ]
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
    expected = Colocalization(source1 = "source1",
                              source2 = "source2",
                              phenotype1 = "phenotype1",
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
    #sample = "\t".join(map(str,sample))
    actual = Colocalization.from_list(sample)
    assert expected == actual

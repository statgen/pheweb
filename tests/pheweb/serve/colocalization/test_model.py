from pheweb.serve.colocalization.model import nvl, ascii, na, Variant

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

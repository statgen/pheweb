
def test_detect_ref():
    import pheweb.load.detect_ref, os
    default_builds = pheweb.load.detect_ref.get_default_builds()
    filepath = os.path.join(os.path.dirname(__file__), 'input_files/', 'assoc-files', 'has-fields-ac-af-maf.txt') # has only chr10
    variant_iterator = pheweb.load.detect_ref.make_variant_iterator(filepath, num_header_lines=1)
    build_scores = pheweb.load.detect_ref.get_build_scores(variant_iterator)
    for build, score in build_scores.items():
        assert build.hg_name.startswith('hg')
        assert build.grch_name.startswith('GRCh')
        assert sorted(score.keys()) == ['a1','a2','either']
        for a,frac in score.items(): assert 0 <= frac <= 1
        assert score['a1'] + score['a2'] >= score['either']
    matching_build, matching_allele_col = pheweb.load.detect_ref.detect_build(build_scores)
    assert isinstance(matching_build, pheweb.load.detect_ref.Build)
    assert matching_build in default_builds
    assert matching_build.hg_name == 'hg19'
    assert matching_build.grch_name == 'GRCh37'
    assert matching_allele_col == 'a1'

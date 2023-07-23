/* eslint-env jest */
import {assoc_fields, association_layout, lz_conf} from './GeneLocusZoom';
import {GcLambda, Phenotype} from "../../common/commonModel";
import {Layout} from "locuszoom";
import {ConfigurationWindow} from "../Configuration/configurationModel";


test('check assoc fields binary', () => {
    const expected = [
        "association:maf_cases",
        "association:maf_controls",
        "association:id",
        "association:chr",
        "association:position",
        "association:ref",
        "association:alt",
        "association:pvalue",
        "association:pvalue|neglog10_or_100",
        "association:mlogp",
        "association:beta",
        "association:sebeta",
        "association:rsid",
        "association:maf",
        "association:most_severe",
        "association:fin_enrichment",
        "association:INFO",
        "ld:state",
        "ld:isrefvar",
        ];
    const phenotype : Phenotype = ({} as unknown as Phenotype);
    expect(assoc_fields(phenotype)).toStrictEqual(expected);
});

test('check assoc fields quant ', () => {
    const expected = [
        "association:id",
        "association:chr",
        "association:position",
        "association:ref",
        "association:alt",
        "association:pvalue",
        "association:pvalue|neglog10_or_100",
        "association:mlogp",
        "association:beta",
        "association:sebeta",
        "association:rsid",
        "association:maf",
        "association:most_severe",
        "association:fin_enrichment",
        "association:INFO",
        "ld:state",
        "ld:isrefvar",
        ];
    const phenotype : Phenotype = ({ is_binary : false }  as unknown as Phenotype);
    expect(assoc_fields(phenotype)).toStrictEqual(expected);
});

const samplePhenotype = {
    assoc_files: [] ,
    category: "None" ,
    category_index: 10 ,
    phenocode: "T2D" ,
    phenostring: "Type II"
};
test('check assoc layout', () => {
    expect(association_layout(samplePhenotype)).toMatchSnapshot()

});

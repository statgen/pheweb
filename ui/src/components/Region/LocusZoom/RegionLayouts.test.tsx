import { assoc_fields } from './RegionLayouts';
import { Region } from '../RegionModel';

test('check assoc fields binary', () => {
	const expected = [
		'association:maf_cases',
		'association:maf_controls',
		'association:id',
		'association:chr',
		'association:position',
		'association:ref',
		'association:alt',
		'association:pvalue',
		'association:pvalue|neglog10_or_100',
		'association:mlogp',
		'association:beta',
		'association:sebeta',
		'association:rsid',
		'association:maf',
		'association:most_severe',
		'association:fin_enrichment',
		'association:INFO',
		'ld:state',
		'ld:isrefvar'];
	const region : Region = ({} as unknown as Region);
	expect(assoc_fields(region)).toStrictEqual(expected);
});


test('check assoc fields quant ', () => {
	const expected = [
		'association:id',
		'association:chr',
		'association:position',
		'association:ref',
		'association:alt',
		'association:pvalue',
		'association:pvalue|neglog10_or_100',
		'association:mlogp',
		'association:beta',
		'association:sebeta',
		'association:rsid',
		'association:maf',
		'association:most_severe',
		'association:fin_enrichment',
		'association:INFO',
		'ld:state',
		'ld:isrefvar'];
	const region : Region = ({ pheno : { is_binary : false } } as unknown as Region);
	expect(assoc_fields(region)).toStrictEqual(expected);
});

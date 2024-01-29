/* eslint-env jest */
import {
	BioBankURL,
	createBioBankURL, createVariantSummary,
	generateBioBankURL,
	getMapping, RSIDMapping,
	rsidMapping,
	summaryRSIDS,
	VariantSummary,
} from './Variant';
import { Ensembl, Variant as VariantModel } from './variantModel';
import { Variant as CommonVariantModel, variantFromStr } from '../../common/commonModel'
import with_rsid from "./data/with_rsid/16-20341705-C-CA.json"
import without_rsid from "./data/without_rsid/9-97776641-A-G.json"

const testGenerate = async (variant :  CommonVariantModel | undefined,
																	 summary : VariantSummary | undefined) : Promise<BioBankURL[]| null> => {
	const temp : {  state : BioBankURL[]| null}= { state : null };
	const consumer = ( x: BioBankURL[]| null) => { temp.state = x };
	await generateBioBankURL(variant, summary).then(consumer);
	return temp.state;
}

test('rsidMapping', async () => {
	const rsid : string = "rs534125149";
	const mapping : RSIDMapping= await rsidMapping(rsid);
	expect(mapping).toMatchSnapshot();
});

test('rsidMappingFail', async () => {
	global.console = { ...global.console, warn: jest.fn() , log : jest.fn };
	const rsid : string = "rsTHIS_SHOULD_NOT_WORK";
	const mapping : RSIDMapping= await rsidMapping(rsid);
	expect(mapping).toBe(undefined);
	expect(console.warn).toBeCalled();
});


test('rsidMissingMapping', async () => {
	// expects to be null - allow for data to change
	const rsid : string = "rs36146027";
	const mapping : RSIDMapping = await rsidMapping(rsid);
	expect(mapping).toMatchSnapshot();
});


test('getMapping', () => {
	const data_with_mapping : Ensembl.Data = {"synonyms":[],"source":"Variants (including SNPs and indels) imported from dbSNP","minor_allele":null,"MAF":null,"name":"rs534125149","var_class":"indel","ambiguity":null,"mappings":[{"assembly_name":"GRCh37","ancestral_allele":"TGTT","allele_string":"TGTT/TGTTGTT","seq_region_name":"15","location":"15:89444934-89444937","start":89444934,"coord_system":"chromosome","strand":1,"end":89444937}],"most_severe_consequence":"inframe_insertion","evidence":["Frequency","1000Genomes","Cited","ExAC","gnomAD"]}
	const mapping : Ensembl.Mapping = {"allele_string": "TGTT/TGTTGTT", "ancestral_allele": "TGTT", "assembly_name": "GRCh37", "coord_system": "chromosome", "end": 89444937, "location": "15:89444934-89444937", "seq_region_name": "15", "start": 89444934, "strand": 1}
	const data_without_mapping : Ensembl.Data = {"minor_allele":null,"synonyms":[],"source":"Variants (including SNPs and indels) imported from dbSNP","name":"rs36146027","most_severe_consequence":null,"failed":"Variant does not map to the genome","mappings":[],"evidence":["Frequency","1000Genomes","TOPMed","gnomAD"],"ambiguity":null,"MAF":null,"var_class":"sequence alteration"};
	const rsid = "rs36146027";
	const getter = getMapping(rsid);

  expect(getter(null)).toBe(undefined);
	expect(getter(undefined)).toBe(undefined);
	expect(getter(data_with_mapping)).toStrictEqual({mapping, rsid});
	expect(getter(data_without_mapping)).toBe(undefined);
});

test('createBioBankURL', () => {
	const mapping : Ensembl.Mapping = {
		"coord_system": "chromosome",
		"start": 20353028,
		"seq_region_name": "16",
		"allele_string": "AAAAAAA/AAAAAA/AAAAAAAA/AAAAAAAAA",
		"ancestral_allele": "AAAAAAA",
		"strand": 1,
		"end": 20353034,
		"location": "16:20353028-20353034",
		"assembly_name": "GRCh37"
	};
	const rsid = "rs534125149";
	const variant = {chromosome: 16, position: 20341705, reference: 'C', alternate: 'CA'};
	expect(createBioBankURL(null)({rsid,mapping})).toStrictEqual(undefined);
	expect(createBioBankURL(variant)({rsid,mapping})).toStrictEqual({"rsid": "rs534125149", "url": "http://pheweb.sph.umich.edu/SAIGE-UKB/variant/16-20353028-C-CA"});
});

test('summaryRSIDS', () => {
	const summary = {
		"nearestGenes": [
			"ODUM"
		],
		"mostSevereConsequence": "variant",
		"maf": {
			"value": "2.0e-5",
			"start": "2.1e-2",
			"stop": "0.3e-1",
			"properties": [],
			"description": "defined"
		},
		"infoRange": {
			"value": "1.0e+0",
			"start": "9.9e-1",
			"stop": "1.0e+0",
			"properties": []
		},
		"numberAlternativeHomozygotes": "25285",
		"rsids": [
			"rs35832103"
		],
		"chrom": 16,
		"pos": 20340517,
		"ref": "T",
		"alt": "A",
		"posStart": 20140517,
		"posStop": 20540517
	}
	expect(summaryRSIDS(null)).toStrictEqual([]);
	expect(summaryRSIDS(undefined)).toStrictEqual([]);
	expect(summaryRSIDS(summary)).toStrictEqual(["rs35832103"]);
	const rsids = [ "rs15830322", "rs35832103" ]
	expect(summaryRSIDS({ ... summary , rsids })).toStrictEqual(rsids);
});


test('generateBioBankURL', async () => {
	const state : {  state : BioBankURL[]| null}= { state : null }
	const consumer = ( x: BioBankURL[]| null) => { state.state = x };
	const variant: CommonVariantModel | undefined = undefined;
	const summary: VariantSummary | undefined = undefined;
	const rsids: string[] = [];
	const expected: BioBankURL[]| null = [];
	const actual : BioBankURL[]| null = await testGenerate(variant, summary);
	expect(actual).toStrictEqual(expected);
});

test('generateBioBankURLEmpty', async () => {
	const state : {  state : BioBankURL[]| null}= { state : null }
	const consumer = ( x: BioBankURL[]| null) => { state.state = x };
	const variant: CommonVariantModel | undefined = {
		"chromosome": 16,
		"position": 20341705,
		"reference": "C",
		"alternate": "CA"
	};
	const summary: VariantSummary | undefined = {
		"nearestGenes": [
			"UMOD"
		],
		"mostSevereConsequence": "intron variant",
		"maf": {
			"value": "2.2e-1",
			"start": "2.2e-1",
			"stop": "2.2e-1",
			"properties": [],
			"description": "across all phenotype"
		},
		"infoRange": {
			"value": "1.0e+0",
			"start": "9.9e-1",
			"stop": "1.0e+0",
			"properties":[]
		},
		"numberAlternativeHomozygotes": "19081",
		"rsids": [],
		"chrom": 16,
		"pos": 20341705,
		"ref": "C",
		"alt": "CA",
		"posStart": 20141705,
		"posStop": 20541705
	};
	const expected: BioBankURL[]| null = [];
	const actual : BioBankURL[]| null = await testGenerate(variant, summary);
	expect(actual).toStrictEqual(expected);
});

type TestGenerate = {
	data: VariantModel.Data,
	variant : string
	expected : BioBankURL[]| null
}
test('regression test generate', async () => {
	const testCases :TestGenerate[] = [
		{ data : with_rsid ,
			variant : "16-20341705-C-CA",
			expected : [{"rsid": "rs35830321", "url": "http://pheweb.sph.umich.edu/SAIGE-UKB/variant/16-20353028-C-CA"}]
		},
		{ data : with_rsid ,
			variant : "",
			expected : []
		},
		{ data : without_rsid ,
			variant : "9-97776641-A-G",
			expected : []
		},
		{ data : without_rsid ,
			variant : "",
			expected : []
		},
		// causes an exception for non defined fields
		{ data : {
				regions:  [],
				results:  [],
				variant: {  } as unknown as  VariantModel.Variant,
			} ,
			variant : "9-97776641-A-G",
			expected : []
		}
	]

	for (let currentTest of testCases) {
		const actual : BioBankURL[]| null = await testGenerate(variantFromStr(currentTest.variant),createVariantSummary(currentTest.data));
		expect(actual).toStrictEqual(currentTest.expected);
	}
})

test('regression test generate', async () => {
	const data :VariantModel.Data[] = [ with_rsid , with_rsid ];
	const actual = data.map(createVariantSummary);
	expect(actual).toMatchSnapshot();
})

test('can handle fetch failure', async () => {

	const data = {
			regions:  [],
			results:  [],
			variant: {
				varid: "",
				alt : "G", chr : 9, pos : 97776641, ref : 'A',
				annotation : { annot: { }, gnomad: { }, rsids : "rsTHISWILLNOTWORK" } },
		};
	 const variant : string = "9-97776641-A-G";
	 const expected = [];
	global.console = { ...global.console, warn: jest.fn() };
	const actual : BioBankURL[]| null = await testGenerate(variantFromStr(variant),createVariantSummary(data));
	expect(actual).toStrictEqual(expected);
	expect(console.warn).toBeCalled();
})
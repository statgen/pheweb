
import React from "react"
import { chunk, clinvarlESearchCollect, clinvarlESearchURL, empty } from './RegionCustomLocuszooms';

import {clinvar_label, clinvar_significance, clinvar_trait} from "./RegionCustomLocuszooms";
import {Clinvar} from "./RegionModel";

test('clinvar_label', () => {
	expect(clinvar_label('test',undefined)).toStrictEqual([])
	expect(clinvar_label('test',null)).toStrictEqual([])
	expect(clinvar_label('test','label')).toStrictEqual(['test label'])
})

test('clinvar_significance', () => {
	expect(clinvar_significance({} as unknown as Clinvar.Data)).toStrictEqual("")
	expect(clinvar_significance({ clinical_impact_classification : { description : "cic" }} as unknown as Clinvar.Data)).toStrictEqual("Clinical cic")
	expect(clinvar_significance({ germline_classification : { description : "germ" }} as unknown as Clinvar.Data)).toStrictEqual("Germline germ")
	expect(clinvar_significance({ oncogenicity_classification : { description : "oncogenicity" }} as unknown as Clinvar.Data)).toStrictEqual("Oncogenicity oncogenicity")
	expect(clinvar_significance({
		clinical_impact_classification : { description : "cic" },
		germline_classification : { description : "germ" },
		oncogenicity_classification : { description : "oncogenicity" }
	} as unknown as Clinvar.Data)).toStrictEqual("Clinical cic , Germline germ , Oncogenicity oncogenicity")
})

test('clinvar_trait', () => {
	expect(clinvar_trait({} as unknown as Clinvar.Data)).toStrictEqual("")
	expect(clinvar_trait({ clinical_impact_classification : { trait_set : [ { trait_name : "clinical"}] } } as unknown as Clinvar.Data)).toStrictEqual("clinical")
	expect(clinvar_trait({ germline_classification : { trait_set : [ { trait_name : "germline"}] } } as unknown as Clinvar.Data)).toStrictEqual("germline")
	expect(clinvar_trait({ oncogenicity_classification : { trait_set : [ { trait_name : "oncogenicity"}] } } as unknown as Clinvar.Data)).toStrictEqual("oncogenicity")

	expect(clinvar_trait({ clinical_impact_classification : { trait_set : [ { trait_name : "clinical"}] },
		germline_classification : { trait_set : [ { trait_name : "germline"}] },
		oncogenicity_classification : { trait_set : [ { trait_name : "oncogenicity"}] } } as unknown as Clinvar.Data)).toStrictEqual("germline clinical oncogenicity")
})

test("clinvarlESearchURL", () => {
	const actual = "testURL/esummary.fcgi?db=clinvar&retmode=json&id=1,2,3,4"
	const expected = clinvarlESearchURL("testURL/")(["1","2","3","4"])
	expect(actual).toBe(expected)
});

test("chunk", () => {
	const actual = chunk([], 4)
	const expected = []
	expect(actual).toStrictEqual(expected)
});

test("chunk", () => {
	const actual = chunk([1,2,3,4,5], 2)
	const expected = [[1,2],[3,4],[5]]
	expect(actual).toStrictEqual(expected)
});

test("clinvarlESearchURL", () => {
	const actual = clinvarlESearchCollect([])
	const expected = empty
	expect(actual).toBe(expected)
});



import React from "react"
import { chunk, clinvarlESearchCollect, clinvarlESearchURL, empty } from './RegionCustomLocuszooms';

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


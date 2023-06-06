/* eslint-env jest */
import {
  pValueCellFormatter,
  pValueSentinel,
  createHeader,
  addHeader,
  nearestGeneFormatter,
  createCSVLinkHeaders,
  filterDownload, optionalCellScientificFormatter,
  optionalCellNumberFormatter, optionalCellDecimalFormatter,
} from './commonTableColumn';
import {render, screen} from '@testing-library/react'
import React from "react"

test("optionalCellScientificFormatter handles empty string", () => {
  const actual = optionalCellScientificFormatter({ value : "" })
  const expected = ""
  expect(actual).toBe(expected)
});

test("optionalCellScientificFormatter handles numbers", () => {
  const actual = optionalCellScientificFormatter({ value : "1.0" })
  const expected = "1.0e+0"
  expect(actual).toBe(expected)
});


test("optionaCellNumberFormatter handles empty string", () => {
  const actual = optionalCellNumberFormatter({ value : "" })
  const expected = ""
  expect(actual).toBe(expected)
});

test("optionalCellScientificFormatter handles numbers", () => {
  const actual = optionalCellNumberFormatter({ value : "1.0" })
  const expected = 1
  expect(actual).toBe(expected)
});

test("optionalCellDecimalFormatter handles empty string", () => {
  const actual = optionalCellDecimalFormatter({ value : "" })
  const expected = ""
  expect(actual).toBe(expected)
});

test("optionalCellDecimalFormatter handles numbers", () => {
  const actual = optionalCellDecimalFormatter({ value : "1.0" })
  const expected = "1.00"
  expect(actual).toBe(expected)
});

test("null filterDownload", () => {
  const actual = filterDownload(null)
  expect(actual).toBe(true)
});

test("false filterDownload", () => {
  const actual = filterDownload({ accessor : "test" , download : false})
  expect(actual).toBe(false)
});

test("true filterDownload", () => {
  const actual = filterDownload({ accessor : "test", download : true})
  expect(actual).toBe(true)
});

test("implicit CSV Link Header", () => {
  const actual = createCSVLinkHeaders([{ accessor : "test" }])
  expect(actual).toStrictEqual([{"key": "test", "label": "test"}])
});

test("create CSV Link Header", () => {
  const actual = createCSVLinkHeaders([{download : true, accessor : "test" }])
  expect(actual).toStrictEqual([{"key": "test", "label": "test"}])
});

test("skip CSV Link Header", () => {
  const actual = createCSVLinkHeaders([{download : false, accessor : "test" }])
  expect(actual).toStrictEqual([])
});

test("pValueCellFormatterSentinel", () => {
  const actual = pValueCellFormatter({ value : pValueSentinel});
  expect(actual).toBe(" << 5e-324")
});

test("pValueCellFormatter1", () => {
  const actual = pValueCellFormatter({ value : 1});
  const expected = "1.0e+0";
  expect(actual).toBe(expected);
});

test("pValueCellFormatter1text", () => {
  const actual = pValueCellFormatter({ value : 1});
  const expected = "1.0e+0";
  expect(actual).toBe(expected);
});

test("pValueCellFormatterNull", () => {
  const actual = pValueCellFormatter({ value : null});
  expect(actual).toBeNull()
});

test("addHeader empty", () => {
  const actual = addHeader({})
  const expected  = {}
  expect(actual).toStrictEqual(expected)
})

test("addHeader empty title", () => {
  const actual = addHeader({ title: 'title'}, (title : string | null, label : string| null) => <span>{title}</span>)
  const expected  = {"Header": <span>title</span> }
  expect(actual).toStrictEqual(expected)
})


test("nearest gene formatter : null", () => {
  const actual = nearestGeneFormatter(null);
  const expected = <></>;
  expect(actual).toStrictEqual(expected);
    })

test("nearest gene formatter : undefined", () => {
  const actual = nearestGeneFormatter(null);
  const expected = <></>;
  expect(actual).toStrictEqual(expected);
})

test("nearest gene formatter : undefined", () => {
  const actual = nearestGeneFormatter("APOE");
  const expected = [<a href="/gene/APOE">APOE</a>];
  expect(actual).toStrictEqual(expected);
})

test("nearest gene formatter : undefined", () => {
  const actual = nearestGeneFormatter("APOE,MAP3K14");
  const expected = [<a href="/gene/APOE">APOE</a> ,
  <span> , </span> ,
    <a href="/gene/MAP3K14">MAP3K14</a> ,];
  expect(actual).toStrictEqual(expected);
})
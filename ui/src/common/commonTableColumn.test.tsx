/* eslint-env jest */
import { pValueCellFormatter , pValueSentinel , createHeader, addHeader } from "./commonTableColumn"
import {render, screen} from '@testing-library/react'
import React from "react"

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

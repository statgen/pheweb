/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react";
import { variantFromStr } from "./commonModel";
import { cellNumber, cellText, variantLink } from "./commonFormatter";
import { Cell } from "react-table";

test('get search results : trivial', () => {
  expect(cellText({ value: undefined } as unknown as Cell)).toBe('NA')
  expect(cellText({ value: 'NA' } as unknown as Cell)).toBe('NA')
  expect(cellText({ value: '' } as unknown as Cell)).toBe('NA')
  expect(cellText({ value: 'A' } as unknown as Cell)).toBe('A')
  expect(cellText({ value: 'A_B' } as unknown as Cell)).toBe('A B')
})

test('get search results : trivial', () => {
  expect(cellNumber({ value: undefined } as unknown as Cell)).toBe('NA')
  expect(cellNumber({ value: 'NA' } as unknown as Cell)).toBe('NaN')
  expect(cellNumber({ value: '' } as unknown as Cell)).toBe('NA')
  expect(cellNumber({ value: 'A' } as unknown as Cell)).toBe('NaN')
  expect(cellNumber({ value: 1.00 } as unknown as Cell)).toBe('1.0')
  expect(cellNumber({ value: 1.23456789 } as unknown as Cell)).toBe('1.2')
})

test('variant link', () => {
  const variant : string = 'chr1_1_A_G'
  expect(variantLink(undefined)).toStrictEqual(<span>NA</span>)
  expect(variantLink(variantFromStr(variant))).toMatchSnapshot()
})

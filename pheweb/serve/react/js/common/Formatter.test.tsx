/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import {variantToStr , variantFromStr } from "./Model";
import {cell_number, cell_text, variant_link} from "./Formatter";
import {Cell} from "react-table";


test('get search results : trivial', () => {
    const variant : string = 'chr1_1_A_G';
    expect(cell_text({ value : undefined } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : 'NA' } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : '' } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : 'A' } as unknown as Cell)).toBe("A")
    expect(cell_text({ value : 'A_B' } as unknown as Cell)).toBe("A B")
});

test('get search results : trivial', () => {
    const variant : string = 'chr1_1_A_G';
    expect(cell_number({ value : undefined } as unknown as Cell)).toBe("NA")
    expect(cell_number({ value : 'NA' } as unknown as Cell)).toBe("NaN")
    expect(cell_number({ value : '' } as unknown as Cell)).toBe("NA")
    expect(cell_number({ value : 'A' } as unknown as Cell)).toBe("NaN")
    expect(cell_number({ value : 1.00 } as unknown as Cell)).toBe("1.0")
    expect(cell_number({ value : 1.23456789 } as unknown as Cell)).toBe("1.2")
});

test('variant link', () => {
    const variant : string = 'chr1_1_A_G';
    expect(variant_link(undefined)).toStrictEqual(<span>NA</span>)
    expect(variant_link(variantFromStr(variant))).toMatchSnapshot();
})
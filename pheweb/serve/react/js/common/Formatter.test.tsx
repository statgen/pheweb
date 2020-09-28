/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import {variantToStr , variantFromStr } from "./Model";
import {cell_text, variant_link} from "./Formatter";
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
    expect(cell_text({ value : undefined } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : 'NA' } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : '' } as unknown as Cell)).toBe("NA")
    expect(cell_text({ value : 'A' } as unknown as Cell)).toBe("A")
    expect(cell_text({ value : 1.00 } as unknown as Cell)).toBe("1.00")
});
/*
export const cell_text = (props : Cell<string>) => (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' ')
export const cell_number = (props : Cell<number>) => (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2)

 */
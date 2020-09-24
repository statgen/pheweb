/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import renderer from 'react-test-renderer';
import {variantToStr , variantFromStr } from "./Model";
import {cell_text, variant_link} from "./Formatter";
import {Cell} from "react-table";


test('get search results : trivial', () => {
    const variant : string = 'chr1_1_A_G';
    expect(cell_text({ value : undefined } as unknown as Cell)).toStrictEqual({ chromosome : "1" , position : 1 , reference : "A" , alternate : "G"})
});

/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import renderer from 'react-test-renderer';
import {variantToStr , variantFromStr } from "./Model";
import {variant_link} from "./Formatter";

test('parse variant', () => {
    const variant : string = 'chr1_1_A_G';
    expect(variantFromStr(variant)).toStrictEqual({ chromosome : "1" , position : 1 , reference : "A" , alternate : "G"})
});

test('variant link', () => {
    const component = renderer.create(variant_link({ chromosome : "1" , position : 1 , reference : "A" , alternate : "G"}));
    expect(component.toJSON()).toMatchSnapshot();
});

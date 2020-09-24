/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import { compose } from "./Utilities";

test('get search results : trivial', () => {
    expect(compose((x) => x * 2,(y) => y * 3 )(5)).toBe(30)
});
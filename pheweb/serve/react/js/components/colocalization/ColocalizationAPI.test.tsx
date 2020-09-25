/* eslint-env jest */
import {getSearchResults , rest_url} from "./ColocalizationAPI";
import {Locus, locusFromStr} from "../../common/Model";

test('get search results : trivial', () => {
    const phenotype : string = "a"
    const locus = locusFromStr("1:2:A:G")
    locus && expect(rest_url({ phenotype , locus })).toBe("")
});
test('get search results : trivial', () => {
    var count : number = 0;
    getSearchResults(undefined, () => { count++; },(url) => Promise.resolve(new Response()) );
    expect(count).toBe(0)
});


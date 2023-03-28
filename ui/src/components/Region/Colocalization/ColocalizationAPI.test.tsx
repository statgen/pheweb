/* eslint-env jest */
import { getSearchResults, rest_url } from "./ColocalizationAPI";
import { locusFromStr } from "../../../common/commonModel";

test('check rest url', () => {
    const phenotype : string = "a"
    const locus = locusFromStr("1:2-4")
    locus && expect(rest_url({ phenotype , locus })).toBe("/api/colocalization/a/1:2-4" )
});
test('get search results : trivial', () => {
    var count : number = 0;
    getSearchResults(undefined, () => { count++; },(url) => Promise.resolve() );
    expect(count).toBe(0)
});

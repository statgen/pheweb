/* eslint-env jest */
import {getSearchResults , rest_url} from "./ColocalizationAPI";

test('get search results : trivial', () => {
    expect(rest_url({ })).toBe("")
});
test('get search results : trivial', () => {
    var count : number = 0;
    getSearchResults(undefined, () => { count++; },(url) => Promise.resolve(new Response()) );
    expect(count).toBe(0)
});


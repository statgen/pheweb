/* eslint-env jest */
import {getSearchResults } from "./ColocalizationAPI";

test('get search results : trivial', () => {
    var count : number = 0;
    getSearchResults(undefined, () => { count++; },(url) => Promise.resolve(new Response()) );
    expect(count).toBe(0)
});


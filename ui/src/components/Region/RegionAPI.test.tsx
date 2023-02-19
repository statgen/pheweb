import { RegionParameter } from "./RegionModel";
import { Locus } from "../../common/Model";
import { region_url } from "./RegionAPI";

const locus : Locus = { chromosome : 1 , start : 0 , stop : 10  }
const phenotype : string = "RX"
const parameter : RegionParameter = { locus , phenotype };

// @ts-ignore
test('check url', () => {
    expect(region_url(parameter)).toBe("/api/region/RX/1:0-10");
});


/*
// @ts-ignore
test('get search results : trivial', () => {
    const sink = jest.fn(s => {})
    const getURL = jest.fn((url: string, sink: (x: Region) => void) => Promise.resolve())
    getRegion(parameter,
              sink as (s: Region) => void,
        // @ts-ignore
              getURL as (url: string, sink: (x: Region) => void) => Promise<void>);
    expect(getURL.mock.calls[0][0]).toBe("/api/region/RX/1:0-10");

});
 */
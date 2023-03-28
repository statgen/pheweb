import { RegionParams } from "./RegionModel";
import { Locus } from "../../common/commonModel";
import { region_url } from "./RegionAPI";

const locus: Locus = { chromosome: 1, start: 0, stop: 10 };
const phenotype: string = "RX";
const parameter: RegionParams<Locus> = { locus, phenotype };

test("check url", () => {
  expect(region_url(parameter)).toBe("/api/region/RX/1:0-10");
});

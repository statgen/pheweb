/* eslint-env jest */
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createParameter, RegionParams } from "./RegionModel";
import { Locus } from "../../common/commonModel";

Enzyme.configure({ adapter: new Adapter() });
test("get search results : trivial", () => {
  const parameter = createParameter(undefined);
  expect(parameter).toBe(undefined);
});

test("get search results : trivial", () => {
  const result = {
    locus: { chromosome: 4, start: 70815147, stop: 71215147 },
    phenotype: "RX_STATIN",
  };
  const parameter: RegionParams<Locus> | undefined = createParameter({
    locus: "4:70815147-71215147",
    phenotype: "RX_STATIN",
  });
  expect(parameter).toStrictEqual(result);
});

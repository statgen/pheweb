import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createParameter, RegionParameter } from "./RegionModel";

Enzyme.configure({ adapter: new Adapter() })
test('get search results : trivial', () => {
    const parameter = createParameter("");
    expect(parameter).toBe(undefined)
});

test('get search results : trivial', () => {
    const result = {"locus": {"chromosome": 4, "start": 70815147, "stop": 71215147}, "phenotype": "RX_STATIN"}
    const parameter : RegionParameter | undefined = createParameter("/region/RX_STATIN/4:70815147-71215147");
    expect(parameter).toStrictEqual(result)
});

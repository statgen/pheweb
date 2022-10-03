/* eslint-env jest */
import { pValueCellFormatter , pValueSentinel } from "./tableColumn";

test("pValueCellFormatterSentinel", () => {
  const actual = pValueCellFormatter({ value : pValueSentinel});
  expect(actual).toBe(" << 5e-324")
});

test("pValueCellFormatter1", () => {
  const actual = pValueCellFormatter({ value : 1});
  const expected = "1.0e+0";
  expect(actual).toBe(expected);
});

test("pValueCellFormatter1text", () => {
  const actual = pValueCellFormatter({ value : 1});
  const expected = "1.0e+0";
  expect(actual).toBe(expected);
});

test("pValueCellFormatterNull", () => {
  const actual = pValueCellFormatter({ value : null});
  expect(actual).toBeNull()
});
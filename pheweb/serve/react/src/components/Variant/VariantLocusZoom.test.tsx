/* eslint-env jest */
import variantdata from "./VariantLocusZoom.test.data/23_80667282_T_C.json";
import phenocode_1 from "./VariantLocusZoom.test.data/23_80667282_T_C.phenocode_1.json";
import phenocode_2 from "./VariantLocusZoom.test.data/23_80667282_T_C.phenocode_2.json";
import phenocode_3 from "./VariantLocusZoom.test.data/23_80667282_T_C.phenocode_3.json";
import first_of_each_category from "./VariantLocusZoom.test.data/23_80667282_T_C.first_of_each_category.json";
import categoryOrder from "./VariantLocusZoom.test.data/23_80667282_T_C.category_order.json";
import uniqueCategories from "./VariantLocusZoom.test.data/23_80667282_T_C.unique_categories.json";
import {
  doCategoryOrderSort,
  getCategoryOrder,
  getFirstOfEachCategory,
  getUniqueCategories,
  sortPhenotypes
} from "./VariantLocusZoom";
/*
export const data = { 23_80667282_T_C : { variantdata : variantdata , phenocode } }

test('check url', () => {
    expect(1).toBe(1);
});
*/

test('1', () => {
    expect(variantdata.results.map(p => p.phenocode)).toStrictEqual(phenocode_1);
});

test('2', () => {
    const results = sortPhenotypes(variantdata.results)
    expect(results.map(p => p.phenocode)).toStrictEqual(phenocode_2);
});

test('3', () => {
    const results = sortPhenotypes(variantdata.results)
    const actual = getFirstOfEachCategory(results)
    expect(actual.map(p => p.phenocode)).toStrictEqual(first_of_each_category);
});

test('4', () => {
    const results = sortPhenotypes(variantdata.results)
    const first = getFirstOfEachCategory(results)
    const categories = getCategoryOrder(first)
    expect(categories).toStrictEqual(categoryOrder);
});

test('5', () => {
    const results = sortPhenotypes(variantdata.results)
    const first = getFirstOfEachCategory(results)
    const co = getCategoryOrder(first)
    doCategoryOrderSort(results, co)
    expect(results.map(p =>p.phenocode)).toStrictEqual(phenocode_3);
});

test('6', () => {
    const results = sortPhenotypes(variantdata.results)
    const actual = getUniqueCategories(results);
    const expected = uniqueCategories
    actual.sort()
    expected.sort()
    expect(actual).toStrictEqual(expected);
});


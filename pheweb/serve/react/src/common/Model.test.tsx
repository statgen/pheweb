/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import renderer from "react-test-renderer";
import {
  Locus,
  locusFromStr,
  locusToStr,
  stringToChromosome,
  Variant,
  variantFromStr,
  variantToPheweb,
  variantToStr
} from "./Model";
import { variantLink } from "./Formatter";

test('serialize variant 1', () => {
  const variant : Variant = { chromosome: 1, position: 1, reference: 'A', alternate: 'G' }
  expect(variantToStr(variant)).toStrictEqual('1:1_A/G')
})

test('variant to pheweb format 1', () => {
  const variant : Variant = { chromosome: 1, position: 1, reference: 'A', alternate: 'G' }
  expect(variantToPheweb(variant)).toStrictEqual('1-1-A-G')
})



test('string to chromosome', () => {
  const test : { [key:string]: (undefined | number); } = {
    'X' : 23  , 'Y'  : 24 , 'M'  : 25  , 'MT' : 25  ,
    '1' : 1   , '2'  : 2  , '3'  : 3   , '4'  : 4   , '5' : 5   ,
    '6' : 6   , '7'  : 7  , '8'  : 8   , '9'  : 9   , '10' : 10 ,
    '11' : 11 , '12' : 12 , '13' : 13  , '14' : 14  , '15' : 15 ,
    '16' : 16 , '17' : 17 , '18' : 18  , '19' : 19  , '20' : 20 ,
    '21' : 21 , '22' : 22 , '23' : 23  , '24' : 24  , '25' : 25 ,
    'O' : undefined , '' : undefined }

  for (let key in test) {
    const value = test[key]
    expect(stringToChromosome(key)).toBe(value);
  }
})

test('parse variant 1', () => {
  const variant : string = 'chr1_1_A_G'
  const expected : Variant = { chromosome: 1, position: 1, reference: 'A', alternate: 'G' }
  expect(variantFromStr(variant)).toStrictEqual(expected)
})

test('parse variant 2', () => {
  const variant : string = 'variant'
  const expected : Variant | undefined = undefined
  expect(variantFromStr(variant)).toStrictEqual(expected)
})

test('parse variant 3', () => {
  const variant : string = '1:1_A/G'
  const expected : Variant = { chromosome: 1, position: 1, reference: 'A', alternate: 'G' }
  expect(variantFromStr(variant)).toStrictEqual(expected)
})

test('parse variant 4', () => {
  const variant : string = 'A:1_A/G'
  const expected : Variant | undefined = undefined
  expect(variantFromStr(variant)).toStrictEqual(expected)
})

test('parse variant 5', () => {
  const variant : string = "chr9_96792507_T_<INS:ME:ALU>"
  const expected : Variant = { chromosome: 9, position: 96792507, reference: 'T', alternate: '<INS:ME:ALU>' }
  expect(variantFromStr(variant)).toStrictEqual(expected)
})

test('parse variant 6', () => {
  const variant : string = "20-59159857-G-A"
  const expected : Variant = { chromosome: 20, position: 59159857, reference: 'G', alternate: 'A' }
  expect(variantFromStr(variant)).toStrictEqual(expected)
})


test('parse locus 1', () => {
  const locus : string = '1:1-10'
  const expected : Locus = { chromosome: 1, start: 1, stop: 10 }
  expect(locusFromStr(locus)).toStrictEqual(expected)
  expect(locusFromStr('variant')).toStrictEqual(undefined)
})

test('parse locus 2', () => {
  const locus : string = 'variant'
  const expected : Locus | undefined = undefined
  expect(locusFromStr(locus)).toStrictEqual(expected)
})

test('parse locus 3', () => {
  const locus : string = 'A:1-10'
  const expected : Locus | undefined = undefined
  expect(locusFromStr(locus)).toStrictEqual(expected)
})

test('variant to string', () => {
  expect(locusToStr({ chromosome: 1, start: 1, stop: 10 })).toStrictEqual('1:1-10')
})

test('variant link', () => {
  const component = renderer.create(variantLink({ chromosome: 1, position: 1, reference: 'A', alternate: 'G' }))
  expect(component.toJSON()).toMatchSnapshot()
})

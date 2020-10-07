/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import renderer from 'react-test-renderer'
import { variantToStr, variantFromStr, locusFromStr, locusToStr } from './Model'
import { variantLink } from './Formatter'

test('parse variant', () => {
  const variant : string = 'chr1_1_A_G'
  expect(variantFromStr(variant)).toStrictEqual({ chromosome: '1', position: 1, reference: 'A', alternate: 'G' })
  expect(variantFromStr('variant')).toStrictEqual(undefined)
})

test('variant to string', () => {
  expect(variantToStr({ chromosome: '1', position: 1, reference: 'A', alternate: 'G' })).toStrictEqual('1:1_A/G')
})

test('parse locus', () => {
  const variant : string = '1:1-10'
  expect(locusFromStr(variant)).toStrictEqual({ chromosome: '1', start: 1, stop: 10 })
  expect(locusFromStr('variant')).toStrictEqual(undefined)
})

test('variant to string', () => {
  expect(locusToStr({ chromosome: '1', start: 1, stop: 10 })).toStrictEqual('1:1-10')
})

test('variant link', () => {
  const component = renderer.create(variantLink({ chromosome: '1', position: 1, reference: 'A', alternate: 'G' }))
  expect(component.toJSON()).toMatchSnapshot()
})

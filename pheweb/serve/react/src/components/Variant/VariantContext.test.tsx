/* eslint-env jest */
import { createVariant } from "./VariantContext";

test('1', () => {
  const fail = () => { throw (new TypeError()) }

  const variant1 = {
    chromosome: 20,
    position: 59159857,
    reference: 'G',
    alternate: 'A'
  }
  const pheno1 = 'd4ff3eea-e58c-47d3-a456-0ef09afdaca2'

  expect(() => createVariant('', fail)).toThrow(TypeError)
  expect(() => createVariant('/variant', fail)).toThrow(TypeError)
  expect(() => createVariant('/variant/a', fail)).toThrow(TypeError)
  expect(createVariant('/variant/20-59159857-G-A', fail)).toStrictEqual({ phenocode: undefined, variant: variant1 })
  expect(() => createVariant('/variant/20-59159857-G-A/pheno', fail)).toThrow(TypeError)
  expect(createVariant(`/variant/20-59159857-G-A/pheno/${pheno1}`, fail)).toStrictEqual({ variant: variant1, phenocode: pheno1 })
})

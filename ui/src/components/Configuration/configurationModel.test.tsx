/* eslint-env jest */
import { searchParams } from "./configurationModel";

test('searchParams', () => {
  expect(searchParams({})).toStrictEqual("")
  expect(searchParams({ 'a' : 'b' })).toStrictEqual("a=b")
  expect(searchParams({ 'a' : 'b' , 'c' : 'd' })).toStrictEqual("a=b&c=d")
  expect(searchParams({ 'a' : 'b' , 'c' : 'd' , 'e' : 'f' })).toStrictEqual("a=b&c=d&e=f")
  expect(searchParams({ 'a' : ['b1' , 'b2'] , 'c' : 'd' , 'e' : 'f' })).toStrictEqual("a=b1&a=b2&c=d&e=f")
})

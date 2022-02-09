/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react";
import { isQuotaExceeded, QuotaException } from "./chipTableSlice";

test('test : isQuotaExceeded', () => {
  expect(isQuotaExceeded(null as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ code : null } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ code : 22 } as unknown as QuotaException)).toBe(true)
  expect(isQuotaExceeded({ code : 1014 } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ code : 1014 , name : 'NS_ERROR_DOM_QUOTA_REACHED' } as unknown as QuotaException)).toBe(true)
  expect(isQuotaExceeded({ code : 1014 , name : 'NOPE' } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ code : 1014 , name : null } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ code : 0 } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ number : 0 } as unknown as QuotaException)).toBe(false)
  expect(isQuotaExceeded({ number : -2147024882 } as unknown as QuotaException)).toBe(true)
  expect(isQuotaExceeded({ number : 0 } as unknown as QuotaException)).toBe(false)
})

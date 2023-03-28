/* eslint-env jest */
import { isFinngenServer } from "./finngenUtilities";

test('test is finngen server', () => {
   expect(isFinngenServer('https://github.com/FINNGEN/pheweb')).toStrictEqual(false);
   expect(isFinngenServer('http://api.finngen.fi/')).toStrictEqual(true);
   expect(isFinngenServer(undefined)).toStrictEqual(false)

})

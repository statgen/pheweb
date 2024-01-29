type logger = (v: any) => void
export const promiseFulfilled = <X,>(r :  PromiseSettledResult<X>) : r is PromiseFulfilledResult<X> => r.status == "fulfilled";
export const logRejected : <X,>(r :  PromiseSettledResult<X>, logger?: logger) => PromiseSettledResult<X> = (r,logger =console.error) => { if(r.status == 'rejected') { logger(r.reason) }; return r; }
export const promiseFulfilledValue =  <X,>(v : PromiseFulfilledResult<X>) => v?.value;
export const promiseValues = <X,>(values :  PromiseSettledResult<X>[],logger?: logger) => values.map(x =>logRejected(x, logger)).filter(promiseFulfilled).map(promiseFulfilledValue);
export const notBottom = <X,>(x : X | null): x is X => x !== null && x !== undefined;

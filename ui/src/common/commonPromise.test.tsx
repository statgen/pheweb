/* eslint-env jest */
import {
	logRejected,
	notBottom,
	promiseValues,
} from './commonPromise';

test('promise', async () => {
	const promises = [0,1,2,3].map(x => new Promise((resolve,) => { resolve(x); }));
	const results = await Promise.all(promises);
	expect(results).toStrictEqual([0,1,2,3]);

});

const logger = (state : { logged : unknown[]})=>(a : unknown)=>{ state.logged = [...state.logged, a].sort(); };

test('logRejected', async () => {
	const state = { logged : [] };
	const rejected = x => logRejected(x,logger(state));
	const values = [0,1,2,3];
	const promises = values.map(x => new Promise((_, reject) => { reject(x); }));
	const results = await Promise.allSettled(promises).then(values => values.map(rejected));
	const expected = { "logged": values };
	expect(state).toStrictEqual(expected);

});

test('resolve', async () => {
	const promises = [0,1,2,3].map(x => new Promise((resolve, reject) => { if(x % 2){resolve(x);} else {reject(x)} }));
	const state = { logged : [] };
	const expected = {"logged": [0, 2]};
	const results = await Promise.allSettled(promises).then(x => promiseValues(x, logger(state)));
	expect(results).toStrictEqual([1,3]);
	expect(state).toStrictEqual(expected);
});

test('resolve', async () => {
	const values = [0,null,1,null,null,2,null,3,undefined,4].filter(notBottom);
	expect(values).toStrictEqual([0, 1, 2,3,4]);
});
/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import { defaultEmptyArray, compose, flatten, get, mustacheDiv, mustacheSpan, mustacheText } from './commonUtilities';
import { configure, mount } from "enzyme";
import { v4 } from "uuid";

import Adapter from "enzyme-adapter-react-16";
import { variantToPheweb } from './commonModel';

configure({ adapter: new Adapter() });

test("get search results : trivial", () => {
  expect(
    compose(
      (x: number) => x * 2,
      (y: number) => y * 3
    )(5)
  ).toBe(30);
});

test("get", async () => {
  const response: Response = {
    json: () => Promise.resolve({ key: "1" }),
  } as Response;
  const handler = jest.fn((x) => {});
  const fetchURL: (
    input: RequestInfo,
    init?: RequestInit
  ) => Promise<Response> = (input: RequestInfo, init?: RequestInit) => Promise.resolve(response);
  global.fetch = jest.fn(fetchURL) as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  get("url", handler, (url : string) => (e : Error) => {}).then(() => expect(handler.mock.calls.length).toBe(0));
});

test("mustacheDiv", () => {
  const uuid = v4();
  const wrapper = mount(mustacheDiv("<i>{{uuid}}</i>", { uuid }));
  expect(wrapper.text()).toContain(uuid);
});

test("mustacheDiv 23", () => {
    const number23 = mount(mustacheDiv("{{23toX chr}}", { "chr" : 23 }));
    expect(number23.text()).toBe("X");
    const text23 = mount(mustacheDiv("{{23toX chr}}", { "chr" : "23" }));
    expect(text23.text()).toBe("X");
    const text24 = mount(mustacheDiv("{{23toX chr}}", { "chr" : "24" }));
    expect(text24.text()).toBe("24");
});

test("mustacheDiv isX", () => {
    const uuid = v4();
    const isX1 = mount(mustacheDiv("{{#unless (isX chr)}}{{ uuid }}{{/unless}}", { "chr" : "23" , "uuid" : uuid }));
    expect(isX1.text()).toBe("");
    const isX2 = mount(mustacheDiv("{{#unless (isX chr)}}{{ uuid }}{{/unless}}", { "chr" : 23  , "uuid" : uuid}));
    expect(isX2.text()).toBe("");
    const isX3 = mount(mustacheDiv("{{#unless (isX chr)}}{{ uuid }}{{/unless}}", { "chr" : "X"  , "uuid" : uuid }));
    expect(isX3.text()).toBe("");
    const isX4 = mount(mustacheDiv("{{#unless (isX chr)}}{{ uuid }}{{/unless}}", { "chr" : 24  , "uuid" : uuid }));
    expect(isX4.text()).toBe(uuid);
})

test("mustacheSpan", () => {
  const uuid = v4();
  const wrapper = mount(mustacheSpan("<i>{{uuid}}</i>", { uuid }));
  expect(wrapper.text()).toContain(uuid);
});

test("mustacheText", () => {
  const uuid = v4();
  expect(mustacheText("{{uuid}}", { uuid })).toContain(uuid);
});



test("flatten empty", () => {
  expect(flatten<number>([])).toStrictEqual([]);
});

test("flatten singleton", () => {
  const uuid = v4();
  expect(flatten<string>([[uuid]])).toStrictEqual([uuid]);
});

test("flatten list flattens", () => {
  const uuid1 = v4();
  const uuid2 = v4();
  expect(flatten<string>([[uuid1],[uuid2]])).toStrictEqual([uuid1,uuid2]);
});


test("default empty array defaults", () => {
  const uuid1 = v4();
  expect(defaultEmptyArray([],[uuid1])).toStrictEqual([uuid1]);
});

test("default empty array does not default", () => {
  const uuid1 = v4();
  const uuid2 = v4();
  expect(defaultEmptyArray([uuid1],[uuid2])).toStrictEqual([uuid1]);
});

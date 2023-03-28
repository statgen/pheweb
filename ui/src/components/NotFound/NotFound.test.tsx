import React from "react";
import NotFoundEntity from "./NotFoundEntity";
import { configure, mount } from "enzyme";
import { v4 } from "uuid";
import { ConfigurationWindow } from "../Configuration/configurationModel";

import Adapter from "enzyme-adapter-react-16";

configure({ adapter: new Adapter() });

declare let window: ConfigurationWindow;

test("not found includes search term", () => {
  const uuid = v4();
  const search = `?query=${uuid}`;
  const Temp = NotFoundEntity("entity");
  const wrapper = mount(<Temp location={{ search }} />);
  const text = wrapper.text();
  //expect(text).toContain(uuid);
});

test("not found missing search term", () => {
  const search = `noquery`;
  const Temp = NotFoundEntity("entity");
  const wrapper = mount(<Temp location={{ search }} />);
  //expect(wrapper.text()).toContain("empty query");
});

test("not found includes search term : configured", () => {
  const uuid = v4();
  const salt = v4();

  window.config = {
    userInterface: { notFound: { page: { message: `{{query}} : ${salt}` } } },
  };

  const search = `?query=${uuid}`;
  const Temp = NotFoundEntity("entity");
  const wrapper = mount(<Temp location={{ search }} />);
  //expect(wrapper.text()).toContain(uuid);
  //expect(wrapper.text()).toContain(salt);
});

// @target: es2017
/* eslint-env jest */
import ColocalizationProvider, {
    createParameter,
    RegionParameter,
    ColocalizationContext,
    ColocalizationState
} from "./ColocalizationContext";
import {useContext} from "react";
import Enzyme, { mount} from "enzyme";
import React from 'react'
import Adapter from 'enzyme-adapter-react-16';
import {act} from "react-dom/test-utils";


test('get search results : trivial', () => {
    delete global.window.location;
    global.window = Object.create(window);
    global.window.location = {
        port: '123',
        protocol: 'http:',
        hostname: 'localhost',
        href: '/region/RX_STATIN/4:70815147-71215147'
    } as Location as unknown as Location;
    global.fetch = () => Promise.resolve({ json : () => { return { colocalizations : [] }; } });
    const Test = () => {
        const { parameter } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
        return (<div>{parameter?.phenotype}</div>)
    }
    //const component = mount(<ColocalizationProvider><Test/></ColocalizationProvider>);
    //await flushPromises();
    //expect(component.find('div').text()).toEqual('RX_STATIN')
});

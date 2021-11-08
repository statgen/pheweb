import React , { useState, useEffect , useContext } from 'react';
import {mustache_div} from "../../common/Utilities";
import {useLocation} from "react-router-dom";
import {RegionContext, RegionState} from "../Region/RegionContext";
import {ConfigurationState} from "../Configuration/ConfigurationModel";
import {ConfigurationContext} from "../Configuration/ConfigurationContext";

interface Props {};
interface QueryResult {};

const NotFound = (props : Props) => {
      const { userInterface } = useContext<Partial<ConfigurationState>>(ConfigurationContext);
      const search = useLocation().search;
      const query = new URLSearchParams(search).get('query');
      const default_message_template : string = `
      {{#query}}Could not found page for '${query}'{{/query}} 
      {{^query}}An empty query '${query}' was supplied; therefore, a page could not be found.{{/query}}
      `
      /* 1. troubleshoot configuration */
      const message_template : string = userInterface?.notFound?.message || default_message_template;
      const parameters = { query };
      const loading = <div>loading ... </div>;
      return userInterface?loading:mustache_div(message_template, parameters);
}

export default NotFound
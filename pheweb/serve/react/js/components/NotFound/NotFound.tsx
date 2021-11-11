import React , { useState, useEffect , useContext } from 'react';
import {mustacheDiv} from "../../common/Utilities";
import {useLocation} from "react-router-dom";
import {RegionContext, RegionState} from "../Region/RegionContext";
import {ConfigurationUserInterface , ConfigurationWindow} from "../Configuration/ConfigurationModel";


interface Props {};
interface QueryResult {};

declare let window : ConfigurationWindow;

const NotFound = (props : Props) => {
      const { config } = window;
      const search = useLocation().search;
      const query = new URLSearchParams(search).get('query');
      const default_message_template : string = `
      {{#query}}Could not found page for '${query}'{{/query}} 
      {{^query}}An empty query '${query}' was supplied; therefore, a page could not be found.{{/query}}
      `
      const message_template : string = config?.userInterface?.notFound?.message_template || default_message_template;
      const parameters = { query };
      const loading = <div>loading ... </div>;
      return mustacheDiv(message_template, parameters);
}

export default NotFound
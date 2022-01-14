import React from 'react'
import { ConfigurationWindow } from "../Configuration/configurationModel";
import ReactDOMServer from "react-dom/server";
import Table from "./IndexTable";

declare let window: ConfigurationWindow;
const default_banner =
    <h3>Phenotype list</h3>;

interface Props {}

const Index = (props : Props) =>   <Table/>

export default Index;

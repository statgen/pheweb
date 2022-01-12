import React from 'react'
import { ConfigurationWindow } from "../Configuration/ConfigurationModel";
import ReactDOMServer from "react-dom/server";
import Table from "./IndexTable";

declare let window: ConfigurationWindow;
const default_banner =
    <h3>Phenotype list</h3>;

interface Props {}

const Index = (props : Props) => {
  const { config } = window;

  const banner = config?.userInterface?.index?.banner || default_banner;

  return (
    <div>
      {banner}
      <Table/>
    </div>
  )
};

export default Index;

import React from 'react'
import { ConfigurationWindow } from "../Configuration/ConfigurationModel";
import ReactDOMServer from "react-dom/server";

declare let window: ConfigurationWindow;
const default_banner: string =
  ReactDOMServer.renderToString(
    <h3>Phenotype list</h3>
  );

interface Props {}

const Index = (props : Props) => {
  const { config } = window;

  const banner: string = config?.userInterface?.index?.banner || default_banner;

  return (
    <div>
      {banner}
    </div>
  )
};

export default Index;

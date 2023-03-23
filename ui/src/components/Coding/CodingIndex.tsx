import React from "react";
import ReactTooltip from "react-tooltip";
import { SearchForm } from "./features/search/SearchForm";
import { ResultTable } from "./features/table/ResultTable";
import store from "./app/store";
import { Provider } from "react-redux";
import { ConfigurationWindow } from "./../Configuration/configurationModel";
import { defaultConfig } from "./codingModel";

import './style.css';

declare let window: ConfigurationWindow
const config: { [key: string]: any } = window?.config?.userInterface?.coding?.config || defaultConfig;

const Chip = () =>
  <Provider store={store}>
  <div className={"coding"}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "10px",
	    flexDirection: "column"
          }}
        >
          <ReactTooltip
            place="left"
            offset={{ top: -225 }}
            arrowColor="transparent"
            html={true}
          />
	  <div>
	   <span className="title">{config.title}</span>
           <span className="help" data-tip={config.help}>?</span>
	  </div>
          <div>
            <SearchForm />
            <ResultTable />
          </div>
        </div>
      </div>
    </Provider>
export default Chip;

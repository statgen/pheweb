import React from "react";
import ReactTooltip from "react-tooltip";
import { SearchForm } from "./features/search/SearchForm";
import { ResultTable } from "./features/table/ResultTable";
import store from "./app/store";
import { Provider } from "react-redux";

import chipConfig from "./chipConfig";
import './style.css';

const typedConfig: { [key: string]: any } = chipConfig;

const Chip = (props : { } ) =>
  <Provider store={store}>
  <div style={{ padding: "10px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "10px",
          }}
        >
          <ReactTooltip
            place="left"
            offset={{ top: -225 }}
            arrowColor="transparent"
            html={true}
          />
          <div className={"container"}>
            <SearchForm />
            <ResultTable />
          </div>
        </div>
      </div>
    </Provider>
export default Chip;

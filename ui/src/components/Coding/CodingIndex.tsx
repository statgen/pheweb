import React from "react";
import ReactTooltip from "react-tooltip";
import { SearchForm } from "./features/search/SearchForm";
import { ResultTable } from "./features/table/ResultTable";
import store from "./app/store";
import { Provider } from "react-redux";

import './style.css';

const Chip = (props : { } ) =>
  <Provider store={store}>
  <div className={"coding"}>
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
          <div>
            <SearchForm />
            <ResultTable />
          </div>
        </div>
      </div>
    </Provider>
export default Chip;

import React from "react";
import { mustacheDiv } from "../../common/commonUtilities";
import LOFTable from "./LOFTable";

interface Props {}

const banner=''

const LOF = (props : Props) =>
  <div>
    <h2>LoF burden results</h2>
    {mustacheDiv(banner,{})}
    <LOFTable/>
  </div>

export default LOF

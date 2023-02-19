import React from "react";
import { mustacheDiv } from "../../common/Utilities";
import CodingTable from "./CodingTable";

interface Props {}

const banner=''

const Coding = (props : Props) =>
  <div>
    <h2>Coding variants</h2>
    {mustacheDiv(banner,{})}
    <CodingTable/>
  </div>

export default Coding

import React, { Fragment, useContext } from "react";
import { LavaaConfiguration, Variant } from "./variantModel";
import { VariantContext, VariantState } from "./VariantContext";
import loading from "../../common/Loading";
import { Lavaa } from "lavaa";
import { ConfigurationWindow } from "../Configuration/configurationModel";

declare let window: ConfigurationWindow;
const lavaa : LavaaConfiguration|undefined = window?.config?.userInterface?.variant?.lavaa;


interface Props { variantData : Variant.Data }

const VariantLavaaPlot = ({ variantData } : Props) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext);
  return (lavaa && lavaa.display === true && colorByCategory)?<Fragment>
    <Lavaa dataprop={variantData.phenos} colorByCategory={colorByCategory} />
  </Fragment>:loading
}

export default VariantLavaaPlot
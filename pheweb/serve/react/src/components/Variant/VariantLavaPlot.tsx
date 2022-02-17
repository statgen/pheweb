import React, { Fragment, useContext } from "react";
import { Variant } from "./variantModel";
import { VariantContext, VariantState } from "./VariantContext";
import loading from "../../common/Loading";
import Lavaa from "./Lava/lavaa";

interface Props { variantData : Variant.Data }

const VariantLavaPlot = ({ variantData } : Props) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext);
  return colorByCategory?<Fragment>
    <Lavaa dataprop={variantData.phenos} colorByCategory={colorByCategory} />
  </Fragment>:loading
}

export default VariantLavaPlot
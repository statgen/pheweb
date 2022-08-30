import React, { Fragment, useContext } from "react"
import { LavaaConfiguration, Variant } from "./variantModel"
import { VariantContext, VariantState } from "./VariantContext"
import loading from "../../common/Loading"
import { Lavaa } from "lavaa"
import { ConfigurationWindow } from "../Configuration/configurationModel"

declare let window: ConfigurationWindow

const defaultDisplay : boolean = true
const defaultLavaaConfiguration : LavaaConfiguration =  { display : defaultDisplay }
const lavaa : LavaaConfiguration = window?.config?.userInterface?.variant?.lavaa || defaultLavaaConfiguration

interface Props { variantData : Variant.Data }

const VariantLavaaPlot = ({ variantData } : Props) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext)
  let result
  const display = lavaa?.display ?? defaultDisplay
  if(display){
    result = (colorByCategory)?<Fragment>
      <Lavaa dataprop={variantData.results} colorByCategory={colorByCategory} />
    </Fragment>:loading
  } else {
    result = <></>
  }
  return result
}

export default VariantLavaaPlot
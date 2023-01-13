import React, { Fragment, useContext, useState } from "react"
import { LavaaConfiguration, Variant } from "./variantModel"
import { VariantContext, VariantState } from "./VariantContext"
import { isLoading } from "../../common/Loading"
import { Lavaa } from "lavaa"
import { ConfigurationWindow } from "../Configuration/configurationModel"

declare let window: ConfigurationWindow

const defaultDisplay : boolean = true
const defaultLavaaConfiguration : LavaaConfiguration =  { display : defaultDisplay }
const lavaa : LavaaConfiguration = window?.config?.userInterface?.variant?.lavaa || defaultLavaaConfiguration

interface Props { variantData : Variant.Data }

const VariantLavaaPlot = ({ variantData } : Props) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext)
  const [showPlot, setShowPlot] = useState<boolean>(false);
  const toggle = () => setShowPlot(!showPlot)

  let result
  const display = lavaa?.display ?? defaultDisplay
  const plot = () => <Lavaa dataprop={variantData.results} colorByCategory={colorByCategory} />
  const button = () => <button class="btn btn-primary" onClick={toggle} >{ showPlot? "hide lavaa plot" : "show lavaa plot" }</button>
  const content = () => <Fragment>
  	{ button () }
	{ showPlot && plot() }
  </Fragment>

  if(display){
    result = isLoading(colorByCategory == undefined,content)
  } else {
    result = <></>
  }
  return result
}

export default VariantLavaaPlot
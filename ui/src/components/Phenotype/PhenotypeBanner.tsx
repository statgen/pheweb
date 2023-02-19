import loading from "../../common/Loading";
import { mustacheDiv } from "../../common/Utilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";

interface Props { pheno : { phenocode? : string , risteys? : string } }
const default_banner = `
        <h2 style="marginTop: 0">
        {{phenostring}}
        </h2>
        <p>{{category}}</p>
  `

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.phenotype?.banner || default_banner;

const PhenotypeBanner = (props : Props) => {
  const context = props.pheno
  if(context.phenocode) {
    context.risteys = context.phenocode.replace('_EXALLC', '').replace('_EXMORE', '')
  }
  return context == null ? loading: mustacheDiv(banner, context)
}

export default PhenotypeBanner

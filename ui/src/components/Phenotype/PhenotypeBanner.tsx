import { useContext } from "react";
import { isLoading } from "../../common/CommonLoading";
import { mustacheDiv } from "../../common/commonUtilities"
import { ConfigurationWindow } from "../Configuration/configurationModel"
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import { Phenotype } from "../Index/indexModel";

interface Props {}
const default_banner = `
        <h2 style="marginTop: 0">
        {{phenostring}}
        </h2>
        <p>{{category}}</p>

        {{#risteys}}
        <p style="margin-bottom: 10px;">
           <a href="https://risteys.finngen.fi/phenocode/{{.}}"
              target="_blank"
              class="risteys">RISTEYS
           </a>
        </p>
        {{/risteys}}

        <table class="column_spacing">
           <tbody>
              {{#num_cases}}
              <tr><td><b>{{.}}</b> cases</td></tr>
              {{/num_cases}}

              {{#num_controls}}
              <tr><td><b>{{.}}</b> controls</td></tr>
              {{/num_controls}}
           </tbody>
        </table>
  `

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.phenotype?.banner || default_banner;

const PhenotypeBanner = (props : Props) => {
  const { phenotype } = useContext<Partial<PhenotypeState>>(PhenotypeContext);
  const content = () => mustacheDiv<Phenotype>(banner, phenotype)
  return isLoading(phenotype === null || phenotype === undefined,content);

}

export default PhenotypeBanner

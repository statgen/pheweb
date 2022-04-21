import React, { useContext } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GeneContext, GeneState } from "./GeneContext";
import { mustacheDiv } from "../../common/Utilities";

interface Props {}

const default_footer: string = `
{{#selectedPhenotype}}
<div class="row">
    <div class="pheno-info col-xs-12">
      <p style="margin-bottom: 0"><b>{{assoc.phenostring}}</b></p>
          <p style="margin-bottom: 0"><b>{{assoc.n_case}}</b> cases, <b>{{assoc.n_control}}</b> controls</p>
          <p style="margin-bottom: 0">{{assoc.category}}</p>
    </div>
</div>
{{/selectedPhenotype}}
`
declare let window: ConfigurationWindow;
const { config } = window;
const footer : string = config?.userInterface?.gene?.phenotype?.footer || default_footer;

const GenePhenotypeAssociationSelected = ( props : Props) => {
  const { selectedPhenotype } = useContext<Partial<GeneState>>(GeneContext);
  if(selectedPhenotype !== undefined && selectedPhenotype !== null){
    const context = { selectedPhenotype }
    return mustacheDiv(footer, context);
  } else {
    return <div/>
  }
}

export default GenePhenotypeAssociationSelected
import React, { useContext } from "react";
import PhenotypeContextProvider, { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import PhenotypeBanner from "./PhenotypeBanner";
import { RouteComponentProps } from "react-router-dom";
import { PhenotypeParams } from "./phenotypeModel";
import PhenotypeGWASPlot from "./PhenotypeGWASPlot";
import './phenotype.css';
import PhenotypeTab from "./PhenotypeTab";
import PhenotypeQQPlot from "./PhenotypeQQPlot";
import { hasError, isLoading } from "../../common/CommonLoading";

type Props = RouteComponentProps<PhenotypeParams>;

const Phenotype = (prop : Props) =>
  <PhenotypeContextProvider params={prop.match.params} >
    <PhenotypeContent/>
  </PhenotypeContextProvider>

const PhenotypeContent = () => {
  const { errorMessage , phenotype} = useContext<Partial<PhenotypeState>>(PhenotypeContext);

  const content = () => <div>
  <PhenotypeBanner/>
  <PhenotypeGWASPlot/>
  <PhenotypeTab/>
  <PhenotypeQQPlot/>
  </div>;

  return hasError(errorMessage, isLoading(phenotype === null || phenotype === undefined, content));

}
export default Phenotype;

import React, { useContext, useEffect } from "react";
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import { PhenotypeVariantData } from "./phenotypeModel";
import { isLoading } from "../../common/Loading";
import { createGWASPlot } from "./phenotypeGWASD3";

const PhenotypeGWASPlot = () => {
  const { phenotypeCode, phenotypeVariantData } = useContext<Partial<PhenotypeState>>(PhenotypeContext);
  useEffect(()=> {
    phenotypeCode !== null &&
    phenotypeCode !== undefined &&
    phenotypeVariantData !== null &&
    phenotypeVariantData !== undefined &&
    createGWASPlot(phenotypeCode, phenotypeVariantData.variant_bins, phenotypeVariantData.unbinned_variants);
  }, [phenotypeCode, phenotypeVariantData])

  return <div id='manhattan_plot_container'/>;
}

export default PhenotypeGWASPlot;
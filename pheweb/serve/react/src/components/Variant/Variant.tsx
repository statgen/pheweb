import React, { useEffect, useState } from "react";
import { Variant as CommonVariantModel, variantFromStr } from "../../common/Model";
import { Ensembl, Variant as VariantModel } from "./variantModel";
import { getEnsembl, getVariant } from "./variantAPI";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/Utilities";
import loading from "../../common/Loading";
import VariantTable from "./VariantTable";
import VariantLocusZoom from "./VariantLocusZoom";
import { numberFormatter, scientificFormatter } from "../../common/Formatter";
import ReactTooltip from "react-tooltip";
import { finEnrichmentLabel } from "../Finngen/gnomad";
import VariantContextProvider from "./VariantContext";
import VariantLavaaPlot from "./VariantLavaaPlot";
interface Props {}

export const createVariant = (href : string = window.location.href) : CommonVariantModel | undefined  => {
  const match = href.match("/variant/(.+)$")
  if(match){
    const [, variantString ] : Array<string> = match;
    const variant : CommonVariantModel | undefined = variantFromStr(variantString)
    return variant
  }
}

interface KeyValue {
  key : string
  value : string
}

interface MAF {
  value : string
  start : string
  stop : string
  properties :  KeyValue[]
  description : string }

interface GnomAD {
  finEnrichment : string
  afFin : string
  afPopmax : string
  properties :  KeyValue[]
}

interface InfoRange {
  value: string
  start : string
  stop : string
  properties :  KeyValue[]
}

interface VariantSummary {
  nearestGenes : string[]
  mostSevereConsequence? : string
  infoRange? : InfoRange
  numberAlternativeHomozygotes? : string
  rsids : string[]
  maf? : MAF
  gnomAD? : GnomAD
  chrom : number
  pos : number
  posStart : number
  posStop : number
  ref : string
  alt : string
}

const createVariantSummary = (variantData : VariantModel.Data) : VariantSummary => {
  const nearestGenes : string [] = variantData.variant.annotation.nearest_gene.split(",");
  const mostSevereConsequence = variantData?.variant?.annotation?.annot?.most_severe?.replace(/_/g, ' ')

  const isNumber = function(d) { return typeof d == "number"; };
  const mafs : number[] = variantData.results.map(function(v) {
    if (isNumber(v.maf_control))  { return v.maf_control; }
    else if ('af' in v && isNumber(v['af'])) { return v['af']; }
    else if ('af_alt' in v && isNumber(v['af_alt'])) { return v['af_alt']; }
    else if ('maf' in v && isNumber(v['maf'])) { return v['maf']; }
    else if ('ac' in v &&
             'num_samples' in v &&
             isNumber(v['ac']) &&
             v['ac'] !== 0 &&
             isNumber(v['num_samples'])) { return v['ac'] / v['num_samples']; }
    else { return undefined; }
  });
  const numPhenotypesWithMaf = mafs.filter(isNumber)
  const annot = variantData?.variant?.annotation?.annot

  let maf : MAF | undefined = undefined

  {
    const createIndex = (key) => {
      return { key : key.replace(/AF_|\.calls|_Drem|_R[1-9]/g, '') ,
               value :  (+annot[key]).toExponential(2)}
    }
    let properties = annot === undefined || annot == null ? []  :
    Object.keys(annot).filter((key) => key.indexOf('AF_') === 0 ).map(createIndex)

    const value = 'AF' in annot ? annot['AF'] : undefined
    if(mafs.length === numPhenotypesWithMaf.length){
      maf = {
        value : scientificFormatter(value),
        start : scientificFormatter(Math.min(...mafs)) ,
        stop : scientificFormatter(Math.max(...mafs)) ,
        properties ,
        description : 'across all phenotype' }
    } else {
      //{v : variantData.variant }
      maf = {
        value : scientificFormatter(value),
        start : scientificFormatter(Math.min(...numPhenotypesWithMaf)) ,
        stop : scientificFormatter(Math.max(...numPhenotypesWithMaf)),
        properties ,
        description : 'for phenotypes where it is defined' }
    }
  }

  let gnomAD : GnomAD
  {
    const gnomad = variantData?.variant?.annotation?.gnomad
    let finEnrichment : string = finEnrichmentLabel(gnomad)

    // af fin
    let afFin :string | undefined
    if(gnomad && 'AF_fin' in gnomad && !isNaN(+gnomad['AF_fin']) && isFinite(+gnomad['AF_fin'])){
      afFin = scientificFormatter(+gnomad['AF_fin']);
    } else {
      afFin = undefined
    }

    // af pop max
    let afPopmax :string | undefined
    if(gnomad && 'AF_fin' in gnomad && !isNaN(+gnomad['AF_popmax']) && isFinite(+gnomad['AF_popmax'])){
      afPopmax = scientificFormatter(+gnomad['AF_popmax']);
    } else {
      afPopmax = undefined
    }

    const reshape = (key) => { return { key : key.replace(/AF_|\.calls|_Drem|_R[1-9]/g, ''), value : scientificFormatter(+gnomad[key]) } }
    const filter = (key) => key.indexOf('AF_') === 0
    let properties = gnomad === undefined || annot === null ? []  : Object.keys(gnomad).filter(filter).map(reshape)

    gnomAD = (afFin !== undefined && afPopmax !== undefined) ? { finEnrichment , afFin , afPopmax , properties } : undefined

  }


  // info range
  let infoRange : InfoRange
  {
    const info = 'INFO' in annot ? annot['INFO'] : undefined
    if(annot && info){
      let infos : number[] = Object.keys(annot).filter(function(key) {
        return key.indexOf('INFO_') === 0
      })
      .map(function(k) { return annot[k] })
      .map(x => +x).filter(x => !isNaN(x));
      let [start, stop] = [ scientificFormatter(Math.min(...infos)),
                            scientificFormatter(Math.max(...infos))];
      const filter = (key) => key.indexOf('AF_') === 0
      const reshape = (key) => {
        return { key : key.replace(/AF_|\.calls|_Drem|_R[1-9]/g, ''), value : scientificFormatter(+annot[key]) }
      }
      let properties = annot === undefined || annot === null ? []  : Object.keys(annot).filter(filter).map(reshape)

      infoRange  = { value : scientificFormatter(info),
                     start,
                     stop ,
                     properties }
    } else {
      infoRange = undefined
    }
  }

  const acHom = variantData?.variant?.annotation?.annot
  const numberAlternativeHomozygotes = 'AC_Hom' in acHom && !isNaN(+acHom['AC_Hom'])?numberFormatter(+acHom['AC_Hom']/2):undefined
  const rsids : string[] = variantData?.variant?.annotation?.rsids?.split(',') || []
  const chrom = variantData.variant.chr
  const pos = variantData.variant.pos
  const posStart = pos - 200000
  const posStop = pos + 200000

  const ref = variantData.variant.ref
  const alt = variantData.variant.alt

  const variantSummary : VariantSummary = {
    nearestGenes ,
    mostSevereConsequence ,
    maf,
    infoRange ,
    gnomAD ,
    numberAlternativeHomozygotes ,
    rsids ,
    chrom ,
    pos ,
    ref ,
    alt ,
    posStart ,
    posStop
  }
  return variantSummary
}

const default_banner: string = `
<div class="variant-info col-xs-12">
        <h1 style="margin-top:0">
          {{summary.chrom}}:{{summary.pos}}:{{summary.ref}}:{{summary.alt}}
          {{#summary.rsids}}
          ({{.}})
          {{/summary.rsids}}
        </h1>
        <p style="margin-bottom: 0px;">
          Nearest gene:
          {{#summary.nearestGenes}}
          <a style="color:black" href="/gene/{{.}}">{{.}}</a>
          {{/summary.nearestGenes}}
        </p>

        <p id="annotation" style="margin-bottom: 0px;">
           {{#summary.mostSevereConsequence}}
             <span id="most_severe">
                Most severe consequence: {{.}}
             </span>
           {{/summary.mostSevereConsequence}}
        </p>

       {{#summary.maf}}
       <p id="maf-range"
          style="margin-bottom: 0px;text-decoration: underline;"
          data-place="bottom"
          data-tip="<div style='display: flex; flex-direction: column; flex-wrap: wrap; height: 320px;'>
                    {{#properties}}
                         <div>
                              <span style='text-align: left; float: left; padding-right: 10px;'>{{value}}</span>
                              <span style='text-align: left; float: left;'>{{key}}</span>
                         </div>
                    {{/properties}}
                    </div>
          "
          html="true"
          data-html="true">
          AF {{value}} ( ranges from {{start}} to {{stop}} {{description}} )

       </p>
       {{/summary.maf}}

       {{#summary.gnomAD}}
       <p id="gnomad"
          style="margin-bottom: 0px;text-decoration: underline;"
          data-place="bottom"
          data-tip="<div style='display: flex; flex-direction: column; flex-wrap: wrap; height: 320px;'>
                    {{#properties}}
                         <div>
                              <span style='text-align: left; float: left; padding-right: 10px;'>{{value}}</span>
                              <span style='text-align: left; float: left;'>{{key}}</span>
                         </div>
                    {{/properties}}
                    </div>
          "
          html="true"
          data-html="true">
          AF in gnomAD genomes 2.1: FIN {{afFin}} POPMAX {{afPopmax}} FIN enrichment vs. NFEE:  {{finEnrichment}}
       </p>
       {{/summary.gnomAD}}
       {{^summary.gnomAD}}
          No data found in gnomAD 2.1.1
       {{/summary.gnomAD}}

       {{#summary.infoRange}}
       <p id="info-range"
          style="margin-bottom: 0px;text-decoration: underline;"
          data-place="bottom"
          data-tip="<div style='display: flex; flex-direction: column; flex-wrap: wrap; height: 320px;'>
                    {{#properties}}
                         <div>
                              <span style='text-align: left; float: left; padding-right: 10px;'>{{value}}</span>
                              <span style='text-align: left; float: left;'>{{key}}</span>
                         </div>
                    {{/properties}}
                    </div>
          "
          html="true"
          data-html="true">
          {{value}} (ranges in genotyping batches from {{start}} to {{stop}} )
       </p>
       {{/summary.infoRange}}

       {{#summary.numberAlternativeHomozygotes}}
       <p id="info-range"
          style="margin-bottom: 0px;">
          Number of alt homozygotes:  {{.}}
       </p>
       {{/summary.numberAlternativeHomozygotes}}




       <p style="margin-bottom: 0px;">View in
          <a href="https://genetics.opentargets.org/variant/{{ summary.chrom }}_{{ summary.pos}}_{{ summary.ref}}_{{ summary.alt }}">Open Targets</a> ,
          <a href="https://gnomad.broadinstitute.org/variant/{{ summary.chrom }}-{{ summary.pos}}-{{ summary.ref}}-{{ summary.alt }}?dataset=gnomad_r3">gnomAD</a> ,
          <a href="http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr{{ chrom }}%3A{{ summary.pos }}-{{ summary.pos }}&position=chr{{ summary.chrom }}%3A{{ summary.posStart }}-{{ summary.posStop }}">UCSC</a>

          {{#summary.rsids.length}}
          , GWAS Catalog for
          {{/summary.rsids.length}}

          {{#summary.rsids}}
          <a href="http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?searchType=adhoc_search&type=rs&rs={{ . }}">{{.}}</a>
          {{/summary.rsids}}

          {{#summary.rsids.length}}
          , dbSNP for
          {{/summary.rsids.length}}

          {{#summary.rsids}}
          <a href="http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?searchType=adhoc_search&type=rs&rs={{ . }}">{{.}}</a>
          {{/summary.rsids}}


          {{#bioBankURL.length}}
          , UMich UK Biobank
          {{/bioBankURL.length}}
          {{#bioBankURL}}
            <a href="{{url}}" target='_blank'>{{rsid}}</a>
          {{/bioBankURL}}

       </p>
       <p style="margin-bottom: 0px;">
          p-values smaller than 1e-10 are shown on a log-log scale
       </p>

</div>
`

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.variant?.banner || default_banner;

interface  BioBankURL {rsid: string, url: string}
interface BannerData { bioBankURL : BioBankURL[] , summary : VariantSummary }
type BioBankURLObject = {[p: string]: string} | null

const bannerData = (variantData :  VariantModel.Data, bioBankURLObject: BioBankURLObject) : BannerData => {
  const bioBankURL : BioBankURL[] = bioBankURLObject == null ? [] : Object.entries(bioBankURLObject).map(([k,v])=> { return { rsid : k , url : v}})
  const summary = createVariantSummary(variantData)
  return { bioBankURL , summary }
}

const Variant = (props : Props) => {
  const [variantData, setVariantData] = useState<VariantModel.Data | null>(null);
  const [bioBankURL, setBioBankURL] = useState<{ [ key : string ] : string }| null>(null);

  useEffect(() => {
    const variant = createVariant()
    variant && getVariant(variant, setVariantData)
  },[]);

  useEffect(() => {
    if(variantData && bioBankURL == null) {
      const variant = createVariant()
      const summary = createVariantSummary(variantData)
      summary?.rsids?.forEach((rsid) => {
        getEnsembl(rsid, (e: Ensembl.Data) => {
          if (e && e.mappings && e.mappings.length > 0) {
            const mapping: Ensembl.Mapping = e.mappings[0]
            const url : string = `http://pheweb.sph.umich.edu/SAIGE-UKB/variant/${mapping.seq_region_name}-${mapping.start}-${variant.reference}-${variant.alternate}`
            setBioBankURL({...(bioBankURL == null? {} : bioBankURL),...{ [rsid] : url } })
          }
        })
      })
    }
  },[variantData, setBioBankURL,bioBankURL]);

  // the null check is on  bioBankURL == null as for some reason
  // the tool tip is not happing loading this later.
  return variantData == null?loading:
    <VariantContextProvider>
    <React.Fragment>

      <div>
        <ReactTooltip />
             <div className="variant-info col-xs-12">
                 {mustacheDiv(banner,bannerData(variantData, bioBankURL))}
             </div>
      </div>
      <div>
        <VariantLavaaPlot variantData={variantData}/>
      </div>

      <div>
           <VariantLocusZoom variantData={variantData} />
      </div>

      <div>
           <VariantTable variantData={variantData} />
      </div>
  </React.Fragment>
  </VariantContextProvider>
}


export default Variant;
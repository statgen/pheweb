import React, { useEffect, useState, useCallback } from "react"
import { Variant as CommonVariantModel, variantFromStr } from "../../common/commonModel"
import { Ensembl, Variant as VariantModel, Sumstats } from "./variantModel"
import { getEnsembl, getVariant, getVariantPhenotype } from "./variantAPI"
import { ConfigurationWindow } from "../Configuration/configurationModel"
import { mustacheDiv } from "../../common/commonUtilities"
import { hasError, isLoading } from "../../common/CommonLoading"
import VariantTable from "./VariantTable"
import VariantLocusZoom from "./VariantLocusZoom"
import { numberFormatter, scientificFormatter } from "../../common/commonFormatter"
import ReactTooltip from "react-tooltip"
import { finEnrichmentLabel } from "../Finngen/finngenGnomad"
import VariantContextProvider from "./VariantContext"
import VariantLavaaPlot from "./VariantLavaaPlot"
import { Either, Left, Right } from "purify-ts/Either"
import { notBottom, promiseValues } from '../../common/commonPromise';
declare let window: ConfigurationWindow;
const { config } = window;

const default_banner: string = `
<div className="variant-info col-xs-12">
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
                    </div>"
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
                    </div>"
		 html="true"
		 data-html="true">
		AF in gnomAD genomes 2.1: FIN {{afFin}} POPMAX {{afPopmax}} FIN enrichment vs. NFEE:  {{finEnrichment}}
	</p>
	{{/summary.gnomAD}}
	{{^summary.gnomAD}} No data found in gnomAD 2.1.1 {{/summary.gnomAD}}

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
                    </div>"
		 html="true"
		 data-html="true">
		INFO {{value}} (ranges in genotyping batches from {{start}} to {{stop}} )
	</p>
	{{/summary.infoRange}}

	{{#summary.numberAlternativeHomozygotes}}
	<p id="alt-homozygotes"
		 style="margin-bottom: 0px;">
		Number of alt homozygotes:  {{.}}
	</p>
	{{/summary.numberAlternativeHomozygotes}}


	<div>

		<p style="margin-bottom: 0px;">View in
			<a target="_blank" href="https://genetics.opentargets.org/variant/{{ 23toX summary.chrom }}_{{ summary.pos}}_{{ summary.ref}}_{{ summary.alt }}">Open Targets</a> ,
			<a target="_blank" href="https://gnomad.broadinstitute.org/variant/{{ 23toX summary.chrom }}-{{ summary.pos}}-{{ summary.ref}}-{{ summary.alt }}?dataset=gnomad_r3">gnomAD</a> ,
			<a target="_blank" href="http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr{{ chrom }}%3A{{ summary.pos }}-{{ summary.pos }}&position=chr{{ summary.chrom }}%3A{{ summary.posStart }}-{{ summary.posStop }}">UCSC</a>

			{{#summary.rsids.length}} , GWAS Catalog for {{/summary.rsids.length}}
			{{#summary.rsids}} <a target="_blank" href="https://www.ebi.ac.uk/gwas/search?query={{ . }}">{{.}}</a> {{/summary.rsids}}
			{{#summary.rsids.length}} , dbSNP for {{/summary.rsids.length}}
			{{#summary.rsids}}
			<a id="urlDbSNP" target="_blank" href="http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?searchType=adhoc_search&type=rs&rs={{ . }}">{{.}}</a>
			{{/summary.rsids}}

			{{#unless (isX summary.chrom) }}
			{{#bioBankURL.length}} , UMich UK Biobank {{/bioBankURL.length}}

			{{#bioBankURL}}
			{{#if url}}
			<a href="{{url}}" target="_blank">{{rsid}}</a>
			{{else}}
			<span class="alert-danger">failed loading {{rsid}}</span>
			{{/if}}
			{{/bioBankURL}}
			{{/unless}}
		</p>

		<p style="margin-bottom: 0px;">
			p-values smaller than 1e-10 are shown on a log-log scale
		</p>

	</div>
`
const banner: string = config?.userInterface?.variant?.banner || default_banner;

export type BioBankURL = {rsid: string, url: string}
interface BannerData { bioBankURL : BioBankURL[] , summary : VariantSummary }
interface Props {}

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

export interface VariantSummary {
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

interface sortOptionsObj {
  id: string;
  desc: boolean;
  currentPage: number;
  pageSize: number;
}

export type RSIDMapping = { mapping : Ensembl.Mapping ,
  rsid : string };


export const createVariant = (pathanme : string = window.location.pathname) : Either<string,CommonVariantModel>  => {
  const match = pathanme.match("^/variant/(.+)$")
  if(match){
    const [, variantString ] : Array<string> = match;
    const variant : CommonVariantModel | undefined = variantFromStr(variantString)
    if(variant == null){
      return Left(`Could not parse variant from '${variantString}'`)
    } else {
      return Right(variant);
    }
  } else {
    Left(`Could not parse variant from url '${pathanme}'`)
  }
}

export const createVariantSummary = (variantData : VariantModel.Data) : VariantSummary | undefined => {

  const nearestGenes : string [] = variantData?.variant?.annotation?.annot?.nearest_gene?.split(",") || [];
  const mostSevereConsequence = variantData?.variant?.annotation?.annot?.most_severe?.replace(/_/g, ' ')

  const isNumber = function(d) { return typeof d == "number"; };

  const extractMAFS = (v) => {
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
  };

  const mafs : number[] = variantData.results.map(extractMAFS);
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

    const value = annot && 'AF' in annot ? annot['AF'] : undefined
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
    let afPopmax :string | undefined
    // af pop malet
    if(gnomad && 'AF_fin' in gnomad && 'afPopmax' in gnomad && !isNaN(+gnomad['AF_popmax']) && isFinite(+gnomad['AF_popmax'])){
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
    const info = annot && 'INFO' in annot ? annot['INFO'] : undefined
    if(annot && info){

      let infos : number[] = Object.keys(annot).filter(function(key) {
        return key.indexOf('INFO_') === 0
      })
      .map(function(k) { return annot[k] })
      .map(x => +x).filter(x => !isNaN(x));
      let [start, stop] = [ scientificFormatter(Math.min(...infos)),
                            scientificFormatter(Math.max(...infos))];
      const filter = (key) => key.indexOf('INFO_') === 0
      const reshape = (key) => {
        return { key : key.replace(/INFO_|\.calls|_Drem|_R[1-9]/g, ''), value : scientificFormatter(+annot[key]) }
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
  const numberAlternativeHomozygotes = acHom && 'AC_Hom' in acHom && !isNaN(+acHom['AC_Hom'])?numberFormatter(+acHom['AC_Hom']/2):undefined
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


const bannerData = (variantData :  VariantModel.Data, bioBankURL: BioBankURL[]) : BannerData => {
  const summary = createVariantSummary(variantData)
  const data = { bioBankURL , summary }
  return data;
}

export const summaryRSIDS = (summary: VariantSummary | null | undefined) : string[] => {
    const rsids = summary?.rsids || [];
    // valid rsids start with rs
     const validated = rsids.filter((id) => `${id}`.startsWith("rs"));
     const deduplicated = [... new Set(validated)];
    const sorted = deduplicated.sort();
    return sorted;
}

export const getMapping = (rsid : string | undefined | null) => (e: Ensembl.Data | null | undefined | void)  : RSIDMapping | undefined=> {
      let rsidmapping : RSIDMapping | undefined;
      if (rsid && e && e.mappings && e.mappings.length > 0) {
          rsidmapping = { mapping : e.mappings[0], rsid }
          } else {
         rsidmapping = undefined;
        }
      return rsidmapping;
    }

export const rsidMapping = (rsid : string) : Promise<null | RSIDMapping> => getEnsembl(rsid).then(getMapping(rsid))

export const createBioBankURL = (v : CommonVariantModel | undefined) => (rsidMapping : RSIDMapping) : BioBankURL | undefined => {
  let bioBankURL;
  const mapping = rsidMapping.mapping;
  const rsid = rsidMapping.rsid;

  if(v && mapping && rsid){
    const url : string = `http://pheweb.sph.umich.edu/SAIGE-UKB/variant/${mapping.seq_region_name}-${mapping.start}-${v.reference}-${v.alternate}`
    bioBankURL = { rsid , url};
  } else {
    bioBankURL = undefined;
  }
  return bioBankURL;
}
export const generateBioBankURL = (variant :  CommonVariantModel | undefined,
	                                summary : VariantSummary | undefined) : Promise<BioBankURL[]>=> {
  const rsids : string[] = summaryRSIDS(summary);
  const mappings : Promise<RSIDMapping[]> = Promise.allSettled<Promise<RSIDMapping>[]>(rsids.map(rsidMapping)).then(promiseValues<RSIDMapping>);
	return  mappings.then( v => v.filter(notBottom).map(createBioBankURL(variant))).then( v => v.filter(notBottom));
}

const Variant = (props : Props) => {
  const [variantData, setVariantData] = useState<VariantModel.Data | null>(null);
  const [bioBankURL, setBioBankURL] = useState<BioBankURL[]| null>(null);
  const [error, setError] = useState<string|null>(null);
  const [varSumstats, setSumstats] = useState<Sumstats.Data | null>(null);
  const [rowId, setRowid] = useState<number | null>(null);
  const [phenocode, setPheno] = useState<string | null>(null);
  const [variantDataPlots, setVariantDataPlots] = useState<VariantModel.Data | null>(null);
  const [initialState, setInitialState] = useState<boolean>(true);
  const [sortOptions, setSortOptions] = useState< sortOptionsObj| null >(null);
  const [activePage, setActivePage] = useState<number | null>(null);

  useEffect(() => {
    createVariant().bimap(setError, variant => getVariant(variant, setVariantData, setError));
  },[]);

  // get summary statistics for a specific phenotype
  const getSumstats = useCallback(( rowid: number, varid: string, pheno: string, sorted: sortOptionsObj ) => {
      setPheno(pheno);
      setRowid(rowid);
      setSortOptions(sorted);
      getVariantPhenotype(varid, pheno, setSumstats);
  }, []);

  // update summary statistics for a specific row
  const updatePhenoResultsRow = ( row: VariantModel.Result, varSumstats: Sumstats.Data, index: number ) => {
      var rowUpdated = { ...row, ...varSumstats?.results, 'clicked': true, 'index': index};
      return rowUpdated
  };

  // update variant data
  const updateVariantData = (variantData: VariantModel.Data) => {
    var results = variantData.results.map((item, index) => (
      index === rowId ? updatePhenoResultsRow(item, varSumstats, index) : {...item, 'clicked': false, 'index': index}
    ));
    var variantDataNew = {...variantData,
                          regions: variantData?.regions,
                          results: results,
                          variant: variantData?.variant};
    return variantDataNew
  }

  const getJumpToPage = (variantData:  VariantModel.Data, sortOptionsTable: sortOptionsObj, rowId: number) => {

    // return current page if sorting column id is not amongst var sumstats cols
    var page = null;
    if (sortOptionsTable['id'] === 'pval' || sortOptionsTable['id'] === 'mlogp' ||
        sortOptionsTable['id'] === 'beta' || sortOptionsTable['id'] === 'af_cases' ||
        sortOptionsTable['id'] === 'af_controls'){

      var result = variantData.results.filter(
        item => item.mlogp !== null && item.pval !== null && item.beta !== null
      );

      var sortBy = sortOptionsTable['id'];
      var resultSorted = sortOptionsTable['desc'] ?
        result.sort(function(a, b){return b[sortBy]-a[sortBy]}) :
        result.sort(function(a, b){return a[sortBy]-b[sortBy]});

      // calculate page number based on the position in the sorted table
      page = sortOptionsTable['currentPage'];
      for (var i in resultSorted){
        if (result[i]['index'] == rowId ) {
          page = Math.floor( Number(i) / sortOptionsTable['pageSize']);
        }
      }
    }
    return page;
  }

  useEffect(() => {
    if (variantData){
      const dataNew = updateVariantData(variantData);
      setVariantData(dataNew);
      setSumstats(null);
      setInitialState(false);
      setActivePage(getJumpToPage(dataNew, sortOptions, rowId));
    }
  }, [varSumstats, phenocode, rowId]);

  // reset active page - needed to be able to click next/previous page selection
  useEffect(() => {
    if (activePage){
      setActivePage(null);
    }
  }, [activePage]);

  useEffect(() => {
    // inititalize variant data to be passed to the lavaa and zoomLocus plots
    if (variantData && initialState) {
      setVariantDataPlots(variantData);
    }
    // set the biobank urls
    if(variantData && bioBankURL == null) {
      const variant :  CommonVariantModel | undefined = createVariant().orDefault(undefined);
      const summary : VariantSummary | undefined = createVariantSummary(variantData);
      generateBioBankURL(variant, summary).then(setBioBankURL);
    }
  },[variantData, setBioBankURL,bioBankURL]);

  // lazy load
  const content = () => <VariantContextProvider>
    <React.Fragment>
      <div>
        <div className="variant-info col-xs-12">
          {mustacheDiv(banner,bannerData(variantData, bioBankURL))}
        </div>
        <ReactTooltip className={'variant-tooltip'} multiline={true} html={true} />
      </div>

      <div>
        <VariantLavaaPlot variantData={variantDataPlots}/>
      </div>

      <div>
        <VariantLocusZoom variantData={variantDataPlots}/>
      </div>

      <div>
        <VariantTable variantData={variantData} getSumstats={getSumstats} activePage={activePage} />
      </div>
    </React.Fragment>
  </VariantContextProvider>
  return hasError(error,isLoading(variantData == null || bioBankURL == null,content));

}

export default Variant;
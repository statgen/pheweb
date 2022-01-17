import { Column, HeaderProps, Renderer } from "react-table";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Headers, LabelKeyObject } from "react-csv/components/CommonPropTypes";

interface PhewebWindow extends Window {
  release_prev: number;
}

declare let window: PhewebWindow;


export const pValueSentinel = 5e-324;

const textFormatter = (props : { value : any }) => props.value;

const decimalFormatter = (props) => (+props.value).toPrecision(3);
const optionalDecimalFormatter = (props) => isNaN(+props.value) ? props.value : decimalFormatter(props);


const numberFormatter = (props) => +props.value;
const optionalNumberFormatter = (props) => isNaN(+props.value) ? props.value : numberFormatter;

const scientificFormatter = (props) => (+props.value).toExponential(1);
const optionalScientificFormatter = (props) => isNaN(+props.value) ? props.value : scientificFormatter(props);

const pValueFormatter = (props) => (props.value == pValueSentinel) ? ` << ${pValueSentinel}` : props.value.toExponential(1);

const arrayFormatter = (props) => { return props?.value?.join(" ") || "" }

const phenotypeFormatter = (props) => (<a href={`/pheno/${props.original.pheno || props.original.phenocode}`}
                                          target="_blank">{props.value == "NA" ? props.original.pheno : props.value}</a>);


const formatters = {
  "text": textFormatter,

  "decimal": decimalFormatter,
  "optionalDecimal": decimalFormatter,

  "number": numberFormatter,
  "optionalNumber": optionalNumberFormatter,

  "scientific": scientificFormatter,
  "optionalScientific": optionalScientificFormatter,

  "pValue": pValueFormatter,

  "array": arrayFormatter,

  "phenotype": phenotypeFormatter
};


const variantSorter = (a, b) => {
  const v1 = a.split(":").map(e => +e);
  const v2 = b.split(":").map(e => +e);
  if (v1[0] != v2[0]) return v1[0] > v2[0] ? 1 : -1;
  return v1[1] > v2[1] ? 1 : -1;
};

const naSorter = (a, b) => {
  a = +a;
  b = +b;
  if (isNaN(a)) {
    if (isNaN(b)) {
      return 0;
    }
    return 1;
  }
  if (isNaN(b)) {
    return -1;
  }
  return a - b;
};

const naSmallSorter = (a, b) => {
  a = +a;
  b = +b;
  if (isNaN(a)) {
    if (isNaN(b)) {
      return 0;
    }
    return -1;
  }
  if (isNaN(b)) {
    return 1;
  }
  return a - b;
};

const stringToCountSorter = (a, b) => {
  const c = a.split(";").filter(x => x != "NA").length;
  const d = b.split(";").filter(x => x != "NA").length;
  return d - c;
};

const sorters = {
  "variant": variantSorter,
  "number": naSorter,
  "numberNASmall": naSmallSorter,
  "string": stringToCountSorter
};


const id_filter = (filter, row) => row[filter.id] <= filter.value;

const filters = {
  "id": id_filter
};

const maxTableWidth = 1600;
const columnWith = (size) => Math.min(size, size / maxTableWidth * window.innerWidth);

const phenotypeColumns = {
  chipPhenotype: {
    Header: () => (<span title="phenotype" style={{ textDecoration: "underline" }}>pheno</span>),
    accessor: "LONGNAME",
    filterMethod: (filter, row) => {
      const v = filter.value.split("|");
      return (v[0] == "top" ? !!row._original.is_top : true) && row[filter.id].toLowerCase().indexOf(v[1].toLowerCase()) > -1;
    },
    Filter: ({ filter, onChange }) => {
      return (<div>
        <select
          onChange={event => {
            return onChange(event.target.value + (filter && filter.value.split("|")[1] || ""));
          }}
          style={{ width: "100%" }}
          value={filter ? filter.value.split("|")[0] + "|" : "all|"}>
          <option value="all|">all phenos</option>
          <option value="top|">only top pheno per variant</option>
        </select><br />
        <input style={{ float: "left" }} type="text"
               onChange={event => onChange((filter && filter.value.split("|")[0] || "all") + "|" + event.target.value)} />
      </div>);
    },
    Cell: phenotypeFormatter,
    width: columnWith(200)
  },
  chipVariant: {
    Header: () => (<span title="chr:pos:ref:alt build 38" style={{ textDecoration: "underline" }}>variant</span>),
    accessor: "variant",
    sortMethod: variantSorter,
    filterMethod: (filter, row) => {
      const s = row[filter.id].split(":");
      var v = filter.value.split("|");
      v[1] = v[1].replace("chr", "").replace("X", "23").replace(/_|-/g, ":");
      return (v[0] == "no HLA/APOE" ? !(+s[0] == 6 && +s[1] > 23000000 && +s[1] < 38000000) && !(+s[0] == 19 && +s[1] > 43000000 && +s[1] < 46000000) : true) && row[filter.id].toLowerCase().indexOf(v[1]) > -1;
    },
    Filter: ({ filter, onChange }) => {
      return (<div>
        <select
          onChange={event => {
            return onChange(event.target.value + (filter && filter.value.split("|")[1] || ""));
          }}
          style={{ width: "100%" }}
          value={filter ? filter.value.split("|")[0] + "|" : "all variants|"}
        >
          <option value="all variants|">all variants</option>
          <option value="no HLA/APOE|">no HLA/APOE</option>
        </select><br />
        <input style={{ float: "left", width: "140px" }} type="text"
               onChange={event => onChange((filter && filter.value.split("|")[0] || "all") + "|" + event.target.value)} />
      </div>);
    },
    Cell: props => (
      <a data-html={true}
         data-tip={ReactDOMServer.renderToString(<img style={{ maxWidth: "100%", maxHeight: "100%" }}
                                                      id="cplot"
                                                      alt={props.value}
                                                      src={`/api/v1/cluster_plot/${props.value}`} />)}
         href={"https://gnomad.broadinstitute.org/variant/" + props.value.replace(/:/g, "-") + "?dataset=gnomad_r3"}
         target="_blank">{props.value}</a>
    ),
    width: columnWith(135)
  },
  chipRSID: {
    Header: () => (<span title="rsid" style={{ textDecoration: "underline" }}>rsid</span>),
    accessor: "rsid",
    Cell: props => props.value == "NA" ? props.value : (
      <a href={`https://www.ncbi.nlm.nih.gov/snp/{props.value}`} target="_blank">{props.value}</a>
    ),
    width: columnWith(110)
  },
  chipMostSevere: {
    Header: () => (<span title="most severe variant consequence from Variant Effect Predictor"
                         style={{ textDecoration: "underline" }}>consequence</span>),
    accessor: "most_severe",
    filterMethod: (filter, row) => {
      if (["all variants", "loss of function", "missense"].indexOf(filter.value) > -1) {
        return filter.value == "all variants" || (filter.value == "loss of function" && row[filter.id] != "missense_variant") || (filter.value == "missense" && row[filter.id] == "missense_variant");
      } else {
        return row[filter.id].replace(/_/g, " ").indexOf(filter.value) > -1;
      }
    },
    Filter: ({ filter, onChange }) => {
      return (<div>
        <select
          onChange={event => onChange(event.target.value)}
          style={{ width: "100%" }}
          value={filter ? filter.value : "all variants"}
        >
          <option value="all variants">all variants</option>
          <option value="loss of function">loss of function</option>
          <option value="missense">missense</option>
        </select><br />
        <input style={{ float: "left", width: "140px" }} type="text"
               onChange={event => onChange(event.target.value)} />
      </div>);
    },
    Cell: props => props.value.replace(/_/g, " ").replace(" variant", ""),
    width: columnWith(135)
  },
  chipGeneMostSevere: {
    Header: () => (<span title="gene symbol" style={{ textDecoration: "underline" }}>gene</span>),
    accessor: "gene_most_severe",
    Cell: props => (
      props.value == "NA" ? props.value :
        <a
          href={"http://www.omim.org/search/?index=entry&sort=score+desc%2C+prefix_sort+desc&start=1&limit=10&search=" + props.value}
          target="_blank">{props.value}</a>
    ),
    width: columnWith(80)
  },
  chipPValue: {
    Header: () => (<span title="p-value in chip EWAS" style={{ textDecoration: "underline" }}>pval</span>),
    accessor: "pval",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: pValueFormatter,
    width: columnWith(70)
  },
  chipPValueImputed: {
    Header: () => (
      <span title="p-value in imputed data GWAS" style={{ textDecoration: "underline" }}>pval_imp</span>),
    accessor: "pval_imp",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => optionalScientificFormatter,
    width: columnWith(80)
  },
  beta: {
    Header: () => (<span title="effect size beta in chip EWAS" style={{ textDecoration: "underline" }}>beta (se)</span>),
    accessor: "beta",
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: optionalScientificFormatter,
    width: columnWith(60)
  },
  chipBeta: {
    Header: () => (<span title="effect size beta in chip EWAS" style={{ textDecoration: "underline" }}>beta</span>),
    accessor: "beta",
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: optionalScientificFormatter,
    width: columnWith(60)
  },
  chipAF: {
    Header: () => (<span title="allele frequency (cases+controls)" style={{ textDecoration: "underline" }}>af</span>),
    accessor: "af_alt",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: optionalScientificFormatter,
    width: columnWith(60)
  },
  chipAFCase: {
    Header: () => (<span title="allele frequency (cases)" style={{ textDecoration: "underline" }}>af_case</span>),
    accessor: "af_alt_cases",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: scientificFormatter,
    width: columnWith(60)
  },
  chipAFControl: {
    Header: () => (<span title="allele frequency (controls)" style={{ textDecoration: "underline" }}>af_ctrl</span>),
    accessor: "af_alt_controls",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: scientificFormatter,
    width: columnWith(60)
  },
  chipAFFinn: {
    Header: () => (<span title="FIN allele frequency in gnomAD 2.0 exomes"
                         style={{ textDecoration: "underline" }}>af_FIN</span>),
    accessor: "fin_AF",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSmallSorter,
    Cell: optionalScientificFormatter,
    width: columnWith(60)
  },
  chipAFNFSEE: {
    Header: () => (
      <span title="NFSEE (non-Finnish-non-Swedish-non-Estonian European) allele frequency in gnomAD 2.0 exomes"
            style={{ textDecoration: "underline" }}>af_NFSEE</span>),
    accessor: "nfsee_AF",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSmallSorter,
    Cell: optionalScientificFormatter,
    width: columnWith(80)
  },
  chipFINEnrichment: {
    Header: () => (
      <span title="af_fin/af_nfsee in gnomAD 2 exomes" style={{ textDecoration: "underline" }}>FIN enr</span>),
    accessor: "enrichment_nfsee",
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    sortMethod: naSmallSorter,
    Cell: (props) => isNaN(+props.value) ? "NA" : props.value == 1e6 ? "inf" : Number(props.value).toPrecision(3),
    width: columnWith(60)
  },
  chipHetExCh: {
    Header: () => (<span
      title="number of heterozygotes in the 1,069 samples shared between chip and exomes: n_het_exome/n_het_chip/n_het_both_exome_and_chip"
      style={{ textDecoration: "underline" }}>het_ex_chip</span>),
    accessor: "het_ex_ch",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: textFormatter,
    width: columnWith(100)
  },
  chipFETPValue: {
    Header: () => (<span title="Fisher's exact p-value between allele counts on chip and all Finnish exomes"
                         style={{ textDecoration: "underline" }}>FET_p_ex</span>),
    accessor: "FET_p",
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    sortMethod: naSmallSorter,
    Cell: props => <div
      style={{ color: props.value < 1e-10 ? "rgb(224,108,117)" : props.value < 1e-5 ? "rgb(244,188,11)" : "inherit" }}>{isNaN(props.value) ? "NA" : Number(props.value).toExponential(1)}</div>,
    width: columnWith(100)
  },
  chipMissingProportion: {
    Header: () => (<span title="missing genotype proportion" style={{ textDecoration: "underline" }}>missing</span>),
    accessor: "missing_proportion",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => <div
      style={{ color: props.value > 0.2 ? "rgb(244,188,11)" : "inherit" }}>{props.value.toPrecision(2)}</div>,
    width: columnWith(80)
  },
  chipInfoSISU4: {
    Header: () => (<span title="INFO score based on SiSu4 imputation panel (NA if the variant is not in the panel)"
                         style={{ textDecoration: "underline" }}>INFO_imp</span>),
    accessor: "INFO_sisu4",
    filterMethod: (filter, row) => {
      if (["all variants", "in panel", "not in panel"].indexOf(filter.value) > -1) {
        return filter.value == "all variants" || (filter.value == "not in panel" && row[filter.id] == "NA") || (filter.value == "in panel" && row[filter.id] != "NA");
      } else {
        return +row[filter.id] < +filter.value;
      }
    },
    Filter: ({ filter, onChange }) => {
      return (<div>
        <select
          onChange={event => onChange(event.target.value)}
          style={{ width: "100%" }}
          value={filter ? filter.value : "all variants"}
        >
          <option value="all variants">all variants</option>
          <option value="in panel">in panel</option>
          <option value="not in panel">not in panel</option>
        </select><br />
        <input style={{ float: "left", width: "140px" }} type="text"
               onChange={event => onChange(event.target.value)} />
      </div>);
    },
    sortMethod: naSmallSorter,
    Cell: optionalDecimalFormatter,
    width: columnWith(120)
  },
  categoryIndex: {
    Header: () => (<span title="phenotype" style={{ textDecoration: "underline" }}>Category Index</span>),
    label: "category_index",
    id: "category_index",
    accessor: "category_index",
    Cell: numberFormatter,
    minWidth: 300
  },
  phenotype:
    {
      Header: () => (<span title="phenotype" style={{ textDecoration: "underline" }}>phenotype</span>),
      label: "phenotype",
      id: "phenotype",
      accessor: "phenostring",
      Cell: phenotypeFormatter,
      minWidth: 300
    },

  risteysLink:
    {
      Header: () => (<span title="Risteys link" style={{ textDecoration: "underline" }}>Risteys</span>),
      label: "phenocode",
      accessor: "phenocode",
      Cell: props => (<a style={{
        fontSize: "1.25rem",
        padding: ".25rem .5rem",
        backgroundColor: "#2779bd",
        color: "#fff",
        borderRadius: ".25rem",
        fontWeight: 700,
        boxShadow: "0 0 5px rgba(0,0,0,.5)"
      }}
                         href={"https://risteys.finngen.fi/phenocode/" + props.value.replace("_EXALLC", "").replace("_EXMORE", "")}>RISTEYS</a>),
      Filter: ({ filter, onChange }) => null,
      minWidth: 50
    },
  category:
    {
      Header: () => (<span title="phenotype category"
                           style={{ textDecoration: "underline" }}>category</span>),
      label: "category",
      accessor: "category",
      Cell: props => {
        console.log(props.original);
        return <span style={{ color: props.original.color || "black" }}>{props.value}</span>
      },
      minWidth: 200
    },

  numCases:
    {
      Header: () => (<span title="number of cases"
                           style={{ textDecoration: "underline" }}>number of cases</span>),
      label: "number of cases",
      accessor: "num_cases",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  numCasesPrev:
    {
      Header: () => (<span title={`number of cases ${window.release_prev}`}
                           style={{ textDecoration: "underline" }}>{`number of cases ${window.release_prev}`}</span>),
      label: `number of cases ${window.release_prev}`,
      accessor: "num_cases_prev",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  numControls:
    {
      Header: () => (
        <span title="number of controls" style={{ textDecoration: "underline" }}>number of controls</span>),
      label: "number of controls",
      accessor: "num_controls",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  numGwSignificant:
    {
      Header: () => (<span title="number of genome-wide significant hits"
                           style={{ textDecoration: "underline" }}>genome-wide sig loci</span>),
      label: "number of genome-wide significant hits",
      accessor: "num_gw_significant",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  numGwSignificantPrev:
    {
      Header: () => (<span title={`number of genome-wide significant hits ${window.release_prev}`}
                           style={{ textDecoration: "underline" }}>{`genome-wide sig loci ${window.release_prev}`}</span>),
      label: `number of genome-wide significant hits ${window.release_prev}`,
      accessor: "num_gw_significant_prev",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  controlLambda:
    {
      Header: () => (<span title="genomic control lambda 0.5"
                           style={{ textDecoration: "underline" }}>genomic control lambda</span>),
      label: "genomic control lambda 0.5",
      accessor: "lambda",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  ATCCode:
    {
      Header: () => (<span title="ATC code" style={{ textDecoration: "underline" }}>ATC code</span>),
      label: "ATC code",
      accessor: "atc",
      Cell: props => (
        <a href={`https://www.whocc.no/atc_ddd_index/?code=${props.value}`} target="_blank">{props.value}</a>),
      minWidth: 200
    },

  numSamples:
    {
      Header: () => (
        <span title="number of samples" style={{ textDecoration: "underline" }}>number of individuals with &gt; 0 purchases</span>),
      label: "number of samples",
      accessor: "num_samples",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 100
    },

  numEvents:
    {
      Header: () => (
        <span title="number of purchases" style={{ textDecoration: "underline" }}>number of purchases</span>),
      label: "number of purchases",
      accessor: "num_events",
      Cell: props => props.value,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 100
    },

  cohorts:
    {
      Header: () => (<span title="number of cohorts" style={{ textDecoration: "underline" }}>n cohorts</span>),
      label: "number of cohorts",
      accessor: "cohorts",
      Cell: props => +props.value.length,
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      minWidth: 50
    },

  nCohorts:
    {
      Header: () => (<span title="number of cohorts" style={{ textDecoration: "underline" }}>n cohorts</span>),
      accessor: "n_cohorts",
      filterMethod: (filter, row) => row[filter.id] >= +filter.value,
      Cell: props => +props.value,
      minWidth: 80
    },

  chrom:
    {
      Header: () => (<span title="chromosome" style={{ textDecoration: "underline" }}>chr</span>),
      label: "chromosome",
      accessor: "chrom",
      Cell: props => <span style={{ float: "right", paddingRight: "10px" }}>{props.value}</span>,
      filterMethod: (filter, row) => row[filter.id] == filter.value,
      minWidth: 40
    },

  variant:
    {
      Header: () => (<span title="position in build 38" style={{ textDecoration: "underline" }}>variant</span>),
      label: "variant",
      accessor: "pos",
      Cell: props => (
        <a
          href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>
          {props.original.chrom}:{props.original.pos}:{props.original.ref}:{props.original.alt}
        </a>),
      filterMethod: (filter, row) => {
        const s = filter.value.split("-").map(val => +val);
        if (s.length == 1) return row[filter.id] == filter.value;
        else if (s.length == 2) return row[filter.id] > s[0] && row[filter.id] < s[1];
      },
      minWidth: 100
    },
  pos:
    {
      Header: () => (<span title="position in build 38" style={{ textDecoration: "underline" }}>pos</span>),
      label: "position",
      accessor: "pos",
      Cell: props => (
        <a
          href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>{props.value}</a>),
      filterMethod: (filter, row) => {
        const s = filter.value.split("-").map(val => +val);
        if (s.length == 1) return row[filter.id] == filter.value;
        else if (s.length == 2) return row[filter.id] > s[0] && row[filter.id] < s[1];
      },
      minWidth: 100
    },

  ref:
    {
      Header: () => (<span title="reference allele" style={{ textDecoration: "underline" }}>ref</span>),
      label: "reference allele",
      accessor: "ref",
      Cell: props => props.value,
      minWidth: 50
    },

  alt:
    {
      Header: () => (<span title="alternative allele" style={{ textDecoration: "underline" }}>alt</span>),
      label: "alternative allele",
      accessor: "alt",
      Cell: props => props.value,
      minWidth: 50
    },

  locus:
    {
      Header: () => (
        <span title="LocusZoom plot for the region" style={{ textDecoration: "underline" }}>locus</span>),
      label: "position",
      accessor: "pos",
      Cell: props => <a
        href={`/region/${props.original.phenocode}/${props.original.chrom}:${Math.max(props.original.pos - 200 * 1000, 0)}-${props.original.pos + 200 * 1000}`}>locus</a>,
      Filter: ({ filter, onChange }) => null,
      minWidth: 50
    },

  rsid:
    {
      Header: () => (<span title="rsid(s)" style={{ textDecoration: "underline" }}>rsid</span>),
      label: "rsid",
      accessor: "rsids",
      Cell: props => (
        <a
          href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>{props.value}</a>),
      minWidth: 110
    },

  nearestGene:
    {
      Header: () => (<span title="nearest gene(s)" style={{ textDecoration: "underline" }}>nearest gene</span>),
      label: "nearest gene(s)",
      accessor: "nearest_genes",
      Cell: props => (<a href={`/gene/${props.value}`}>{props.value}</a>),
      minWidth: 110
    },

  consequence:
    {
      Header: () => (<span title="VEP consequence" style={{ textDecoration: "underline" }}>consequence</span>),
      label: "VEP consequence",
      accessor: "most_severe",
      Cell: props => props.value,
      minWidth: 180
    },

  or:
    {
      Header: () => (<span title="odds ratio" style={{ textDecoration: "underline" }}>OR</span>),
      label: "odds ratio",
      accessor: "beta",
      filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
      Cell: props => Math.exp(props.value).toFixed(2),
      minWidth: 80
    },

  pValue:
    {
      Header: () => (<span title="p-value" style={{ textDecoration: "underline" }}>p-value</span>),
      accessor: "pval",
      filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
      Cell: pValueFormatter,
      minWidth: 80,
      id: "pval"
    },

  infoScore:
    {
      Header: () => (<span title="INFO score" style={{ textDecoration: "underline" }}>INFO</span>),
      accessor: "info",
      filterMethod: (filter, row) => row[filter.id] >= +filter.value,
      Cell: props => isNaN(+props.value) ? "NA" : (+props.value).toPrecision(3),
      minWidth: 80
    },

  finEnrichment:
    {
      Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European"
                           style={{ textDecoration: "underline" }}>FIN enrichment</span>),
      accessor: "fin_enrichment",
      filterMethod: (filter, row) => row[filter.id] > +filter.value,
      Cell: props => {
        return isNaN(+props.value) ? "" :
          <div style={{
            color: +props.value > 5 ? "rgb(25,128,5,1)"
              : "inherit"
          }}>
            {props.value == 1e6 ? "inf" : props.value == -1 ? "NA" : Number(props.value).toPrecision(3)}
          </div>;
      },
      minWidth: 120
    },

  afUKBB:
    {
      Header: () => (<span title="allele frequency in UKBB" style={{ textDecoration: "underline" }}>af UKBB</span>),
      accessor: "maf",
      filterMethod: (filter, row) => row[filter.id] < +filter.value,
      Cell: props => (props.value == "NA" || props.value == "") ? "NA" : props.value.toPrecision(3),
      minWidth: 110
    },

  af:
    {
      Header: () => (<span title="allele frequency" style={{ textDecoration: "underline" }}>af</span>),
      accessor: "maf",
      filterMethod: (filter, row) => row[filter.id] < +filter.value,
      Cell: props => props.value.toPrecision(3),
      minWidth: 110
    },

  afCases:
    {
      Header: () => (
        <span title="allele frequency in cases" style={{ textDecoration: "underline" }}>af cases</span>),
      accessor: "maf_cases",
      filterMethod: (filter, row) => row[filter.id] < +filter.value,
      Cell: optionalScientificFormatter,
      minWidth: 110
    },

  afControls:
    {
      Header: () => (
        <span title="allele frequency in controls" style={{ textDecoration: "underline" }}>af controls</span>),
      accessor: "maf_controls",
      filterMethod: (filter, row) => row[filter.id] < +filter.value,
      Cell: optionalScientificFormatter,
      minWidth: 110
    },

  mlogp:
    {
      Header: () => (<span title="mlog" style={{ textDecoration: "underline" }}>-log10(p)</span>),
      accessor: "mlogp",
      filterMethod: (filter, row) => row[filter.id] >= +filter.value,
      Cell: props => isNaN(+props.value) ? "NA" : (+props.value).toPrecision(3),
      minWidth: 80,
      id: "mlogp"
    },

  UKBB:
    {
      Header: () => (<span title="UKBB Neale lab result" style={{ textDecoration: "underline" }}>UKBB</span>),
      accessor: "UKBB",
      filterMethod: (filter, row) => row[filter.id] < +filter.value,
      Cell: props => props.original.ukbb ?
        <div>{(Number(props.original.ukbb.beta) >= 0) ?
          <span style={{ color: "green", float: "left", paddingRight: "5px" }}
                className="glyphicon glyphicon-triangle-top" aria-hidden="true">
                          &nbsp;
                    </span> :
          (Number(props.original.ukbb.beta) < 0) ?
            <span style={{ color: "red", float: "left", paddingRight: "5px" }}
                  className="glyphicon glyphicon-triangle-bottom" aria-hidden="true">
                          &nbsp;
                        </span> :
            <span>
                          &nbsp;
                        </span>} {Number(props.original.ukbb.pval).toExponential(1)}</div> : "NA",
      minWidth: 110
    },
  drugType: {
    Header: () => (<span style={{ textDecoration: "underline" }}>molecule</span>),
    accessor: "approvedName",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: textFormatter
  },
  targetClass: {
    Header: () => (<span style={{ textDecoration: "underline" }}>type</span>),
    accessor: "targetClass",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: arrayFormatter
  },
  mechanismOfAction: {
    Header: () => (<span style={{ textDecoration: "underline" }}>action</span>),
    accessor: "mechanismOfAction",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: textFormatter
  },
  disease: {
    Header: () => (<span style={{ textDecoration: "underline" }}>disease</span>),
    accessor: "disease",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: textFormatter
  },
  phase: {
    Header: () => (<span style={{ textDecoration: "underline" }}>phase</span>),
    accessor: "phase",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: textFormatter
  },
  drugId: {
    Header: () => (<span style={{ textDecoration: "underline" }}>id</span>),
    accessor: "drugId",
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value == "NA" ? props.value : (
      <a href={`https://www.ebi.ac.uk/chembl/g/#search_results/all/query={props.value}`}
         target="_blank">
        {props.value}
      </a>
    )

  }
};

export const geneLOFTableColumns = [ phenotypeColumns.rsid ]


export const genePhenotypeTableColumns = [ phenotypeColumns.rsid ]

export const geneFunctionalVariantTableColumns = [
  phenotypeColumns.rsid,
  //consequence -
  //info -
  //FIN enrichment -
  //maf -

]

export const geneDrugListTableColumns = [
  phenotypeColumns.drugType,
  phenotypeColumns.targetClass,
  phenotypeColumns.mechanismOfAction,
  phenotypeColumns.disease,
  phenotypeColumns.phase,
  phenotypeColumns.drugId
]

export const phenotypeListTableColumns = [
  { ...phenotypeColumns.phenotype, "attributes": { "minWidth": 300 } },
  phenotypeColumns.category,
  phenotypeColumns.numCases,
  phenotypeColumns.numControls,
  phenotypeColumns.numGwSignificant,
  phenotypeColumns.controlLambda];

export const phenotypeTableColumns = [
  phenotypeColumns.chrom,
  phenotypeColumns.pos,
  phenotypeColumns.ref,
  phenotypeColumns.alt,
  phenotypeColumns.locus,
  phenotypeColumns.rsid,
  phenotypeColumns.nearestGene,
  phenotypeColumns.consequence,
  phenotypeColumns.infoScore,
  phenotypeColumns.finEnrichment,
  phenotypeColumns.af,
  phenotypeColumns.afCases,
  phenotypeColumns.afControls,
  phenotypeColumns.or,
  phenotypeColumns.pValue,
  phenotypeColumns.mlogp
]

export const chipTableColumns = [
  phenotypeColumns.chipPhenotype,
  phenotypeColumns.chipVariant,
  phenotypeColumns.chipRSID,
  phenotypeColumns.chipMostSevere,
  phenotypeColumns.chipGeneMostSevere,
  phenotypeColumns.chipPValue,
  phenotypeColumns.chipPValueImputed,
  phenotypeColumns.chipBeta,
  phenotypeColumns.chipAF,
  phenotypeColumns.chipAFCase,
  phenotypeColumns.chipAFControl,
  phenotypeColumns.chipAFFinn,
  phenotypeColumns.chipAFNFSEE,
  phenotypeColumns.chipFINEnrichment,
  phenotypeColumns.chipHetExCh,
  phenotypeColumns.chipFETPValue,
  phenotypeColumns.chipMissingProportion,
  phenotypeColumns.chipInfoSISU4
];

export const variantTableColumns = [
  phenotypeColumns.category,
  phenotypeColumns.phenotype,
  phenotypeColumns.beta,
  phenotypeColumns.pValue,
  phenotypeColumns.mlogp,
  phenotypeColumns.chipAFCase,
  phenotypeColumns.chipAFControl
]

export const topHitTableColumns = [
  //Top variant in loci	Phenotype	Nearest Gene(s)	MAF
  { ...phenotypeColumns.phenotype, accessor: "phenocode" },
  phenotypeColumns.variant,
  phenotypeColumns.rsid,
  phenotypeColumns.nearestGene ,
  phenotypeColumns.pValue,
  phenotypeColumns.mlogp
]

interface ColumnArchetype<E extends {}> {
  type: string,
  attributes: Column<E>
}

interface ColumnDescriptor<E extends {}> {
  title: string,
  label: string,
  accessor: keyof E,
  formatter: string,
  minWidth: number,
  sorter: string,
  filter: string
}


type ColumnConfiguration<E> = ColumnArchetype<E> | ColumnDescriptor<E>;
export type TableColumnConfiguration<E> = ColumnConfiguration<E>[] | undefined | null

const createColumn = <Type extends {}>(descriptor: ColumnConfiguration<Type>): Column<Type> => {
  let column: Column<Type>;

  if ("type" in descriptor) {
    column = {
      ...phenotypeColumns[descriptor.type],
      ...("attributes" in descriptor && descriptor.attributes)
    };
  } else {
    const { title, label, accessor, formatter, minWidth, sorter, filter } = descriptor;
    const header: Renderer<HeaderProps<Type>> =
      <span title={`{title || label }`} style={{ textDecoration: "underline" }}>
        {label || title}
      </span>;
    column = {
      Header: header,
      accessor: accessor,
      Cell: formatter in formatters ? formatters[formatter] : textFormatter,
      ...(sorter && sorter in sorters && { sortMethod: sorters[sorter] }),
      ...(filter && filter in filters && { filter: filters[filter] }),
      ...(minWidth && { minWidth })
    };
  }
  return column;
};

export const createTableColumns = <Type extends {}>(param: TableColumnConfiguration<Type>): Column<Type>[] | null => {
  return (param) ? param.map(createColumn) : null;
};

const reshape = <Type extends {}>(column: Column<Type>): LabelKeyObject => {
  let result: LabelKeyObject;
  if (typeof column.accessor == "string") {
    result = { label: column.accessor, key: column.accessor };
  } else {
    throw `invalid column : ${column.accessor} : ${column.id}`;
  }
  return result;
};

export const createCSVLinkHeaders = <Type extends {}>(columns: Column<Type>[] | null): Headers => {
  return columns?.map(reshape) || [];
};
// text
const aboutBanner = `
     <h1>About this site</h1><br>
     <p>
     The genetic association results on this website are from the
     FinnGen study. These results are from 2,269 binary endpoints
     and 3 quantitative endpoints (HEIGHT_IRN, WEIGHT_IRN, BMI_IRN)
     from freeze 9 (April 2021), consisting of 377,277 individuals.
     </p>
     <p>
     This site was built with PheWeb
     (<a href="https://github.com/statgen/pheweb/">original repository</a>,
      <a href="https://github.com/FINNGEN/pheweb/">Finngen repository</a>).
      All positions are on GRCh38.
     </p>
     <p>
     PheWAS contact:
        Samuli Ripatti (samuli.ripatti@helsinki.fi)<br/>
        FinnGen contact: Aarno Palotie (aarno.palotie@helsinki.fi)
     </p>
`
const notFoundEntityMessage = `
    <p>The endpoint <i>'{{query}}'</i> does not exist.</p>

    <p>
    Please check the spelling first. Note that redundant
    and non-meaningful endpoints have been omitted from analyses.
    </p>

    <p>
    Check the omitted endpoints in
    <a href="https://www.finngen.fi/en/researchers/clinical-endpoints">https://www.finngen.fi/en/researchers/clinical-endpoints</a>
    </p>
  </div>
    `
const notFoundPageMessage = `
    <p>The page <i>'{{query}}'</i> could not be found.</p>

`

// configuration
const userInterface = {
  notFound: {
    entity: { message: notFoundEntityMessage },
    page: { message: notFoundPageMessage }
  },
  about: { banner: aboutBanner },
  phenotype: {
    banner: `
    <h2 style="margin-top: 0;">
        {{phenostring}}
        </h2>
        <p>{{category}}</p>
        <p style="margin-bottom: 10px;">
        <a style="
        font-size: 1.25rem;
        padding: .25rem .5rem;
        background-color: #2779bd;
        color: #fff;
        border-radius: .25rem;
        font-weight: 700;
    box-shadow: 0 0 5px rgba(0,0,0,.5);"
           rel="noopener noreferrer"
           href="https://risteys.finngen.fi/phenocode/{{risteys}}"
           target="_blank">RISTEYS
        </a>
      </p>
    `
  },
  index: {
    table: {
      columns: [
        { type: 'phenotype' },
        { type: 'risteysLink' },
        { type: 'category' },
        { type: 'numCases' },
        {
          title: 'number of cases r8',
          label: 'number of cases r8',
          accessor: 'num_cases_prev',
          formatter: 'textCellFormatter',
          filter: 'number'
        },
        { type: 'numControls' },
        { type: 'numGwSignificant' },
        {
          title: 'genome-wide sig loci r8',
          label: 'genome-wide sig loci r8',
          accessor: 'num_gw_significant_prev',
          formatter: 'textCellFormatter',
          filter: 'number'
        },
        { type: 'controlLambda' }
      ]
    }
  },
   gene: { lossOfFunction: null , lz_config : { ld_panel_version : "sisu4" } }
}
const metaData = {}
const application = {
  logo: '<img src="/images/finngen_loop1.gif" style="float: left; width: 60px; height: 60px; margin: -10px; margin-top: 8px">',
  title: 'FREEZE 9 BETA',
  root: 'http://localhost:8081',
  vis_conf: {
    info_tooltip_threshold: 0.8,
    loglog_threshold: 10,
    manhattan_colors: [
      'rgb(53,0,212)',
      'rgb(40, 40, 40)'
    ]
  },
  model: {
    tooltip_underscoretemplate: '<% if(_.has(d, \'chrom\')) { %><b><%= d.chrom %>:<%= d.pos.toLocaleString() %> <%= d.ref %> / <%= d.alt %></b><br><% } %>\n<% if(_.has(d, \'rsids\')) { %><% _.each(_.filter((d.rsids||"").split(",")), function(rsid) { %>rsid: <%= rsid %><br><% }) %><% } %>\n<% if(_.has(d, \'nearest_genes\')) { %>nearest gene<%= _.contains(d.nearest_genes, ",")? "s":"" %>: <%= d.nearest_genes %><br><% } %>\n<% if(_.has(d, \'pheno\')) { %>pheno: <%= d[\'pheno\'] %><br><% } %>\n<% if(_.has(d, \'pval\')) { %>p-value: <%= pValueToReadable(d.pval) %><br><% } %>\n<% if(_.has(d, \'mlogp\')) { %>mlog10p-value: <%= d.mlogp %><br><% } %>\n<% if(_.has(d, \'beta\')) { %>beta: <%= d.beta.toFixed(2) %><% if(_.has(d, "sebeta")){ %> (<%= d.sebeta.toFixed(2) %>)<% } %><br><% } %>\n<% if(_.has(d, \'or\')) { %>Odds Ratio: <%= d[\'or\'] %><br><% } %>\n<% if(_.has(d, \'af_alt\')) { %>AF: <%= d.af_alt.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'af_alt_cases\')) { %>AF cases: <%= d.af_alt_cases.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'af_alt_controls\')) { %>AF controls: <%= d.af_alt_controls.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'maf\')) { %>AF: <%= d.maf.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'maf_cases\')) { %>AF cases: <%= d.maf_cases.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'maf_controls\')) { %>AF controls: <%= d.maf_controls.toFixed(4) %><br><% } %>\n<% if(_.has(d, \'af\')) { %>AF: <%= d[\'af\'] %><br><% } %>\n<% if(_.has(d, \'ac\')) { %>AC: <%= d.ac.toFixed(1) %> <br><% } %>\n<% if(_.has(d, \'r2\')) { %>R2: <%= d[\'r2\'] %><br><% } %>\n<% if(_.has(d, \'tstat\')) { %>Tstat: <%= d[\'tstat\'] %><br><% } %>\n<% if(_.has(d, \'n_cohorts\')) { %>n_cohorts: <%= d[\'n_cohorts\'] %><br><% } %>\n<% if(_.has(d, \'n_hom_cases\')) { %>n_hom_cases: <%= d[\'n_hom_cases\'] %><br><% } %>\n<% if(_.has(d, \'n_hom_ref_cases\')) { %>n_hom_ref_cases: <%= d[\'n_hom_ref_cases\'] %><br><% } %>\n<% if(_.has(d, \'n_het_cases\')) { %>n_het_cases: <%= d[\'n_het_cases\'] %><br><% } %>\n<% if(_.has(d, \'n_hom_controls\')) { %>n_hom_controls: <%= d[\'n_hom_controls\'] %><br><% } %>\n<% if(_.has(d, \'n_hom_ref_controls\')) { %>n_hom_ref_controls: <%= d[\'n_hom_ref_controls\'] %><br><% } %>\n<% if(_.has(d, \'n_het_controls\')) { %>n_het_controls: <%= d[\'n_het_controls\'] %><br><% } %>\n<% if(_.has(d, \'n_case\')) { %>#cases: <%= d[\'n_case\'] %><br><% } %>\n<% if(_.has(d, \'n_control\')) { %>#controls: <%= d[\'n_control\'] %><br><% } %>\n<% if(_.has(d, \'num_samples\')) { %>#samples: <%= d[\'num_samples\'] %><br><% } %>\n'
  }
}


const config = { application , metaData , userInterface , }

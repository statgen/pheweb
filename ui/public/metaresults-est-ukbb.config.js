// text
const aboutBanner = `
    <h1>About this site</h1><br>
    <p>The genetic association results on this website are from the FinnGen study meta-analyzed (inverse variance weighting, see <a href="https://github.com/FINNGEN/META_ANALYSIS/">code repository</a>) with 247 matching endpoints from Estonian biobank and <a href="https://pan.ukbb.broadinstitute.org/">pan-UKBB study</a>. European subset of the pan-UKBB study was used. The FinnGen results are based on freeze 11 (Spring 2023), consisting of 453,733 individuals.</p>
    <p>This site was built with PheWeb (<a href="https://github.com/statgen/pheweb/">original repository</a>, <a href="https://github.com/FINNGEN/pheweb/">Finngen repository</a>). All positions are on GRCh38.</p>
    <p>PheWAS contact: Samuli Ripatti (samuli.ripatti@helsinki.fi)<br/>FinnGen contact: Aarno Palotie (aarno.palotie@helsinki.fi)</p>
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
const gene_lz_config_tooltip = `
  <strong>{{association:id}}</strong><br/>
  <strong>{{association:rsid}}</strong><br/>
  <strong>{{association:most_severe}}</strong><br/>
  <table>
  <tbody
    <tr>
       <td>phenotype</td>
       <td><strong>PHENO</strong></td>
    </tr>
    <tr>
      <td>p-value</td>
      <td><strong>{{association:pvalue|scinotation}}</strong></td>
    </tr>
    <tr>
      <td>beta</td>
      <td><strong>{{association:beta}}</strong> ({{association:sebeta}})</td>
    </tr>
    <tr>
      <td>-log10(p)</td>
      <td><strong>{{association:mlogp|scinotation}}</strong></td>
    </tr>
    <tr>
      <td>FIN enrichment</td>
      <td><strong>{{association:fin_enrichment}}</strong></td>
    </tr>
    <tr>
      <td>INFO</td>
      <td><strong>{{association:INFO}}</strong></td>
    </tr>
  </tbody>
  </table>
`

const pheno_lz_config_tooltip = `
                   <strong>{{association:id}}</strong><br/>
                   <strong>{{association:rsid}}</strong><br/>
                   <strong>{{association:most_severe}}</strong><br/>
                   <table>
                      <tbody>
                        <tr>
                            <td>phenotype</td>
                            <td><strong>PHENO</strong></td>
                        </tr>
                        <tr>
                            <td>p-value</td>
                            <td><strong>{{association:pvalue|scinotation}}</strong></td>
                        </tr>
                        <tr>
                            <td>beta</td>
                            <td><strong>{{association:beta}}</strong> ({{association:sebeta}})</td>
                        </tr>
                        <tr>
                            <td>-log10(p)</td>
                            <td><strong>{{association:mlogp|scinotation}}</strong></td>
                        </tr>
                        <tr>
                            <td>FIN enrichment</td>
                            <td><strong>{{association:fin_enrichment}}</strong></td>
                        </tr>
                        <tr>
                            <td>INFO</td>
                            <td><strong>{{association:INFO}}</strong></td>
                        </tr>
                      </tbody>
                   </table>
`

const userInterface = {
    notFound: {
	entity: { message: notFoundEntityMessage },
	page: { message: notFoundPageMessage }
  },
    region : { ld_panel_version : "sisu42",
	       lz_configuration : { tooltip_html : pheno_lz_config_tooltip ,
			     assoc_fields : [ "association:id",
					      "association:chr",
					      "association:position",
					      "association:ref",
					      "association:alt",
					      "association:pvalue",
					      "association:pvalue|neglog10_or_100",
					      "association:mlogp",
					      "association:beta",
					      "association:sebeta",
					      "association:rsid",
					      "association:most_severe",
					      "association:fin_enrichment",
					      "association:INFO",
					      "ld:state",
					      "ld:isrefvar"
					    ] } },
    gene : { lossOfFunction: null , 
	     functionalVariants : { tableColumns : [
		 { "type" : "rsid"},
		 { "type" : "consequence"},
		 { "type" : "infoScore"},
		 { "type" : "finEnrichmentText"},
		 { "type" : "af"},
		 { "type" : "finnGenPhenotype" , attributes : { label : 'phenotypes p &lt; 1E-04' } }
	     ] },
	     lz_config : { ld_panel_version : "sisu42" ,
		           tooltip_html : gene_lz_config_tooltip ,
	                   assoc_fields : ["association:id",
					 "association:chr",
					 "association:position",
					 "association:ref",
					 "association:alt",
					 "association:pvalue",
					 "association:pvalue|neglog10_or_100",
					 "association:mlogp",
					 "association:beta",
					 "association:sebeta",
					 "association:rsid",
					 "association:most_severe",
					 "association:fin_enrichment",
					 "association:INFO",
					 "ld:state",
					 "ld:isrefvar"] ,
		        } } , 
  about: { banner: aboutBanner },
    variant : { table : { columns : [
        { type: 'category' },
	{ type: 'phenotype' },
	{ type: 'beta' },
	{ type: 'pValue' },
	{ type: 'mlogp' },
        //{ type : 'numCases', attributes  : { accessor: 'n_case' } },
        //{ type : 'numControls', attributes  : { accessor: 'n_control' } },
        /*{
          title: 'FinnGen N cases',
          label: 'FinnGen N cases',
          accessor: 'fg_n_cases',
          formatter: 'number',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'UKBB N cases',
          label: 'UKBB N cases',
          accessor: 'ukbb_n_cases',
          formatter: 'number',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'EstBB N cases',
          label: 'EstBB N cases',
          accessor: 'estbb_n_cases',
          formatter: 'number',
          filter: 'number', sorter : 'number'
        },*/
        {
          title: 'FinnGen AF',
          label: 'FinnGen AF',
          accessor: 'FINNGEN_af_alt',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'UKBB AF',
          label: 'UKBB AF',
          accessor: 'UKBB_af_alt',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'EstBB AF',
          label: 'EstBB AF',
          accessor: 'ESTBB_af_alt',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'FinnGen beta',
          label: 'FinnGen beta',
          accessor: 'FINNGEN_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'UKBB beta',
          label: 'UKBB beta',
          accessor: 'UKBB_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'EstBB beta',
          label: 'EstBB beta',
          accessor: 'ESTBB_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'FinnGen p-value',
          label: 'FinnGen p-value',
          accessor: 'FINNGEN_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'UKBB p-value',
          label: 'UKBB p-value',
          accessor: 'UKBB_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'EstBB p-value',
          label: 'EstBB p-value',
          accessor: 'ESTBB_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
        },
        {
          title: 'heterogeneity p-value',
          label: 'heterogeneity p-value',
          accessor: 'all_inv_var_het_p',
          formatter: 'scientific',
          filter: 'number', sorter : 'number',
	  width: 5   
        }
    ] } },  
    phenotype: {
	variant : { binary : {
	    table : { columns : [

          { type: 'chrom' },
          { type: 'pos' },
	  { type: 'ref' },
	  { type: 'alt' },
	  { type: 'locus' },
	  { type: 'rsid' },
	  { type: 'nearestGene' },
	  { type: 'beta' },
	  { type: 'pValue' },
	  { type: 'mlogp' },
	  /* finngen */
          {
          title: 'FinnGen AF',
          label: 'FinnGen AF',
          accessor: 'FINNGEN_af_alt',
          formatter: 'scientific',
              filter: 'number', sorter : 'number'
	      
         },
          {
          title: 'FinnGen beta',
          label: 'FinnGen beta',
          accessor: 'FINNGEN_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'FinnGen p-value',
          label: 'FinnGen p-value',
          accessor: 'FINNGEN_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
	  /* ukbb */	  
         {
          title: 'UKBB AF',
          label: 'UKBB AF',
          accessor: 'UKBB_af_alt',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'UKBB beta',
          label: 'UKBB beta',
          accessor: 'UKBB_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'UKBB p-value',
          label: 'UKBB p-value',
          accessor: 'UKBB_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
	  /* estbb */	  
         {
          title: 'EstBB AF',
          label: 'EstBB AF',
          accessor: 'ESTBB_af_alt',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'EstBB beta',
          label: 'EstBB beta',
          accessor: 'ESTBB_beta',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'EstBB p-value',
          label: 'EstBB p-value',
          accessor: 'ESTBB_pval',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         },
         {
          title: 'heterogeneity p-value',
          label: 'heterogeneity p-value',
          accessor: 'all_inv_var_het_p',
          formatter: 'scientific',
          filter: 'number', sorter : 'number'
         }

	    ] }
	} } ,
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
        { title: 'number of cases (FinnGen)',
	  label: 'number of cases (FinnGen)',
	  accessor: 'fg_n_cases',
	  formatter: 'number',
	  filter: 'number'
	},
	{ title: 'number of cases (UKBB)',
	  label: 'number of cases (UKBB)',
	  accessor: 'ukbb_n_cases',
	  formatter: 'number',
	  filter: 'number'
	},
	{ title: 'number of cases (EstBB)',
	  label: 'number of cases (EstBB)',
	  accessor: 'estbb_n_cases',
	  formatter: 'number',
	  filter: 'number'
	},
	{ title: 'number of controls (FinnGen)',
	  label: 'number of controls (FinnGen)',
	  accessor: 'fg_n_controls',
	  formatter: 'number',
	  filter: 'number'
	},
	{ title: 'number of controls (UKBB)',
	  label: 'number of controls (UKBB)',
	  accessor: 'ukbb_n_controls',
	  formatter: 'number',
	  filter: 'number'
	},
	{ title: 'number of controls (EstBB)',
	  label: 'number of controls (EstBB)',
	  accessor: 'estbb_n_controls',
	  formatter: 'number',
	  filter: 'number'
	},
        { type: 'numGwSignificant' },
        { type: 'controlLambda' }
      ]
    }
  }
}
const metaData = {}
const application = {
  browser: "Finngen",
  logo: '<img src="/images/finngen_loop1.gif" style="float: left; width: 60px; height: 60px; margin: -10px; margin-top: 8px">',
  title: 'FinnGen R11 + UKBB + Estonia',
  ld_service : "https://api.finngen.fi/api/ld",
  ld_panel_version : "sisu42",
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

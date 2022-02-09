const userInterface = {}
const metaData = {}
const application = {
  'logo' : '<img src="/images/finngen_loop1.gif" style="float: left; width: 60px; height: 60px; margin: -10px; margin-top: 8px">',
  'title' : 'FREEZE 6 BETA' ,
  'root' : 'https://bdev.finngen.fi' ,
  'vis_conf' : {
    "info_tooltip_threshold": 0.8,
    "loglog_threshold": 10,
    "manhattan_colors": [
      "rgb(53,0,212)",
      "rgb(40, 40, 40)"
    ]
  },
  'model' : {
    "tooltip_underscoretemplate": "<% if(_.has(d, 'chrom')) { %><b><%= d.chrom %>:<%= d.pos.toLocaleString() %> <%= d.ref %> / <%= d.alt %></b><br><% } %>\n<% if(_.has(d, 'rsids')) { %><% _.each(_.filter((d.rsids||\"\").split(\",\")), function(rsid) { %>rsid: <%= rsid %><br><% }) %><% } %>\n<% if(_.has(d, 'nearest_genes')) { %>nearest gene<%= _.contains(d.nearest_genes, \",\")? \"s\":\"\" %>: <%= d.nearest_genes %><br><% } %>\n<% if(_.has(d, 'pheno')) { %>pheno: <%= d['pheno'] %><br><% } %>\n<% if(_.has(d, 'pval')) { %>p-value: <%= pValueToReadable(d.pval) %><br><% } %>\n<% if(_.has(d, 'mlogp')) { %>mlog10p-value: <%= d.mlogp %><br><% } %>\n<% if(_.has(d, 'beta')) { %>beta: <%= d.beta.toFixed(2) %><% if(_.has(d, \"sebeta\")){ %> (<%= d.sebeta.toFixed(2) %>)<% } %><br><% } %>\n<% if(_.has(d, 'or')) { %>Odds Ratio: <%= d['or'] %><br><% } %>\n<% if(_.has(d, 'af_alt')) { %>AF: <%= d.af_alt.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'af_alt_cases')) { %>AF cases: <%= d.af_alt_cases.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'af_alt_controls')) { %>AF controls: <%= d.af_alt_controls.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'maf')) { %>AF: <%= d.maf.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'maf_cases')) { %>AF cases: <%= d.maf_cases.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'maf_controls')) { %>AF controls: <%= d.maf_controls.toFixed(4) %><br><% } %>\n<% if(_.has(d, 'af')) { %>AF: <%= d['af'] %><br><% } %>\n<% if(_.has(d, 'ac')) { %>AC: <%= d.ac.toFixed(1) %> <br><% } %>\n<% if(_.has(d, 'r2')) { %>R2: <%= d['r2'] %><br><% } %>\n<% if(_.has(d, 'tstat')) { %>Tstat: <%= d['tstat'] %><br><% } %>\n<% if(_.has(d, 'n_cohorts')) { %>n_cohorts: <%= d['n_cohorts'] %><br><% } %>\n<% if(_.has(d, 'n_hom_cases')) { %>n_hom_cases: <%= d['n_hom_cases'] %><br><% } %>\n<% if(_.has(d, 'n_hom_ref_cases')) { %>n_hom_ref_cases: <%= d['n_hom_ref_cases'] %><br><% } %>\n<% if(_.has(d, 'n_het_cases')) { %>n_het_cases: <%= d['n_het_cases'] %><br><% } %>\n<% if(_.has(d, 'n_hom_controls')) { %>n_hom_controls: <%= d['n_hom_controls'] %><br><% } %>\n<% if(_.has(d, 'n_hom_ref_controls')) { %>n_hom_ref_controls: <%= d['n_hom_ref_controls'] %><br><% } %>\n<% if(_.has(d, 'n_het_controls')) { %>n_het_controls: <%= d['n_het_controls'] %><br><% } %>\n<% if(_.has(d, 'n_case')) { %>#cases: <%= d['n_case'] %><br><% } %>\n<% if(_.has(d, 'n_control')) { %>#controls: <%= d['n_control'] %><br><% } %>\n<% if(_.has(d, 'num_samples')) { %>#samples: <%= d['num_samples'] %><br><% } %>\n"
  }
}

const codingConfig = {
  "title": "FinnGen freeze 10 coding variant results",
  "help": "FinnGen freeze 10 coding variant results<br/><br/>By default you will see top coding variant association results (all results with a p-value < 1e-5).<br/><br/>Search by gene name to get all results of coding variants in that gene for all analyzed binary phenotypes<br/>(more precisely variants whose most severe consequence from VEP annotation is for that gene).<br/>If you can't find your gene, try with another name.<br/><br/>The result table contains association statistics from additive and recessive analysis<br/>of imputed data (412,181 samples from the FinnGen chip and legacy data)<br/>and from additive analysis of chip genotyped data (328,883 samples from the FinnGen chip).<br/><br/>You can hover over the column names to see their explanations and sort the table by the different p-values and other columns.<br/>Hover over a variant id to see the cluster plot for that variant.<br/>Click on \"only top phenotype per variant\" to see only the top association for each variant.<br/>Click on \"only chip\" to see variants that are on the chip and not in the imputation panel.<br/><br/>Not all variants have results for all three analyses:<br/><br/><div style=\"padding-left: 20px\">Additive analysis results of imputed data are available for all variants in the SiSu4.2<br/>imputation panel with imputation INFO score &gt; 0.6 except for variants with a very low MAC<br/>among the cases and controls of each phenotype.<br/><br/>Recessive analysis results of imputed data are available for all variants with at least two<br/>hard-called minor allele homozygotes and imputation INFO score &gt; 0.6.<br/><br/>Additive analysis results of chip genotyped data are available for all variants that passed QC<br/>except for variants with a very low MAC among the cases and controls of each phenotype.</div>",
  "tip": {
    "variant": "chrom-pos-ref-alt (alt is effect allele) - hover over a variant to see its cluster plot",
    "consequence": "most severe consequence from Variant Effect Predictor",
    "resources": "links to FinnGen browser, gnomAD and Open Targets",
    "INFO": "imputation INFO score<br/>NA if the variant is not in the imputation panel",
    "MAF": "minor allele frequency<br/>from imputed data if the variant is in the imputation panel<br/>from chip data otherwise",
    "FIN enr.": "Finnish enrichment: AF_FIN / AF_NFSEE from gnomAD exomes 2.1.1<br/>(NFSEE=non-Finnish-Swedish-Estonian European)<br/>NA if there are neither FIN nor NFSEE alleles in gnomAD or the variant is not in gnomAD",
    "p-val": "additive model p-value from imputed data",
    "p-val rec": "recessive model p-value from imputed data",
    "p-val chip": "additive model p-value from chip genotype data",
    "beta": "additive model effect size beta from imputed data",
    "beta rec": "recessive model effect size beta from imputed data",
    "beta chip": "additive model effect size beta from chip genotype data",
    "rec-add": "recessive -log10(p) minus additive -log10(p)<br/>positive values mean recessive signal is more significant",
    "leads": "data on possible more significant non-coding lead variants in the region<br/>if the lead variant is more than two orders of magnitude stronger than the coding variant, the column is yellow"
  }
}

export default codingConfig;

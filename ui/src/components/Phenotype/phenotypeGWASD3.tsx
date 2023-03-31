import d3Tip from 'd3-tip'
import _ from 'underscore'
import $ from 'jquery'
import * as d3 from 'd3'
import { mustacheText } from '../../common/commonUtilities'
import { numberFormatter, scientificFormatter } from '../../common/commonFormatter'
import { ConfigurationWindow, VisConfiguration } from "../Configuration/configurationModel";
import { UnbinnedVariant, VariantBin } from "./phenotypeModel";
import { ScaleOrdinal } from "d3";

function fmt (format) {
  const args = Array.prototype.slice.call(arguments, 1)
  return format.replace(/{(\d+)}/g, function (match, number) {
    return (typeof args[number] !== 'undefined') ? args[number] : match
  })
}
declare let window: ConfigurationWindow;
const { config } = window;

const defaultVisConfiguration : VisConfiguration = {
  info_tooltip_threshold:0.8,
  loglog_threshold:10,
  manhattan_colors:["rgb(53,0,212)","rgb(40, 40, 40)"],
  tooltip_template : `
        {{#cpra}}<b>{{.}}</b><br/>{{/cpra}}
        {{#rsids}}rsid: {{.}}<br/>{{/rsids}}
        {{#nearestGenes}}nearest genes: {{.}}<br/>{{/nearestGenes}}
        {{#pheno}}pheno: {{.}}<br/>{{/pheno}}
        {{#pvalue}}p-value: {{.}}<br/>{{/pvalue}}
        {{#mlogp}}mlog10p-value: {{.}}<br/>{{/mlogp}}
        {{#beta}}beta: {{.}}<br/>{{/beta}}
        {{#or}}Odds Ratio: {{.}}<br/>{{/or}}
        {{#af_alt}}AF: {{.}}<br/>{{/af_alt}}
        {{#af_alt_cases}}AF cases: {{.}}<br/>{{/af_alt_cases}}
        {{#af_alt_controls}}AF controls: {{.}}<br/>{{/af_alt_controls}}
        {{#maf}}AF: {{.}}<br/>{{/maf}}
        {{#maf_cases}}AF cases: {{.}}<br/>{{/maf_cases}}
        {{#maf_controls}}AF controls: {{.}}<br/>{{/maf_controls}}
        {{#af}}AF: {{.}}<br/>{{/af}}
        {{#ac}}AC: {{.}}<br/>{{/ac}}
        {{#rc}}RC: {{.}}<br/>{{/rc}}
        {{#tstat}}Tstat: {{.}}<br/>{{/tstat}}
        {{#n_cohorts}}n_cohorts: {{.}}<br/>{{/n_cohorts}}
        {{#n_hom_cases}}n_hom_cases: {{.}}<br/>{{/n_hom_cases}}
        {{#n_hom_ref_cases}}n_hom_ref_cases: {{.}}<br/>{{/n_hom_ref_cases}}
        {{#n_het_cases}}n_het_cases: {{.}}<br/>{{/n_het_cases}}
        {{#n_hom_controls}}n_hom_controls: {{.}}<br/>{{/n_hom_controls}}
        {{#n_hom_ref_controls}}n_hom_ref_controls: {{.}}<br/>{{/n_hom_ref_controls}}
        {{#n_het_controls}}#cases: {{.}}<br/>{{/n_het_controls}}
        {{#n_case}}#cases: {{.}}<br/>{{/n_case}}
        {{#n_control}}#controls: {{.}}<br/>{{/n_control}}
        {{#num_samples}}#samples: {{.}}<br/>{{/num_samples}}
        `
}

const vis_conf : VisConfiguration = { ...defaultVisConfiguration ,
                                      ...(config?.userInterface?.phenotype?.vis_conf || {}) }

interface OffSets {
  chrom_extents: { } ,
  chroms: readonly string[] ,
  chrom_genomic_start_positions: { } ,
  chrom_offsets: { } ,
}
const generateChromosomeOffsets = (variantBins : VariantBin[],
                                   unbinnedVariants : UnbinnedVariant[]) : OffSets => {
  const chrom_padding = 2e7
  const chrom_extents = {}

  const update_chrom_extents = function (variant) {
    if (!(variant.chrom in chrom_extents)) {
      chrom_extents[variant.chrom] = [variant.pos, variant.pos]
    } else if (variant.pos > chrom_extents[variant.chrom][1]) {
      chrom_extents[variant.chrom][1] = variant.pos
    } else if (variant.pos < chrom_extents[variant.chrom][0]) {
      chrom_extents[variant.chrom][0] = variant.pos
    }
  }
  variantBins.forEach(update_chrom_extents)
  unbinnedVariants.forEach(update_chrom_extents)

  const chroms = _.sortBy(Object.keys(chrom_extents), parseInt)

  const chrom_genomic_start_positions = {}
  chrom_genomic_start_positions[chroms[0]] = 0
  for (let i = 1; i < chroms.length; i++) {
    chrom_genomic_start_positions[chroms[i]] = chrom_genomic_start_positions[chroms[i - 1]] + chrom_extents[chroms[i - 1]][1] - chrom_extents[chroms[i - 1]][0] + chrom_padding
  }

  // chrom_offsets are defined to be the numbers that make `get_genomic_position()` work.
  // ie, they leave a gap of `chrom_padding` between the last variant on one chromosome and the first on the next.
  const chrom_offsets = {}

  Object.keys(chrom_genomic_start_positions).forEach(function (chrom) {
    chrom_offsets[chrom] = chrom_genomic_start_positions[chrom] - chrom_extents[chrom][0]
  })

  return {
    chrom_extents: chrom_extents,
    chroms: chroms,
    chrom_genomic_start_positions: chrom_genomic_start_positions,
    chrom_offsets: chrom_offsets
  }
}


const createGWASPlot = (phenotypeCode : string,
                        variantBins : VariantBin[],
                        unbinnedVariants : UnbinnedVariant[]) => {
  const offsets = generateChromosomeOffsets(variantBins, unbinnedVariants);
  const getGenomicPosition = (variant) => {
    const chromosomeOffsets = offsets.chrom_offsets;
    return chromosomeOffsets[variant.chrom] + variant.pos
  }

  const renderPlot = () => {
    const root = document.getElementById("manhattan_plot_container");
    if(root == null) return; // wait until page loaded
    const svgWidth : number = root.clientWidth;
    const svgHeight = 550;
    const plotMargin = {
      'left': 70,
      'right': 30,
      'top': 10,
      'bottom': 50
    }
    const plotWidth = svgWidth - plotMargin.left - plotMargin.right
    const plotHeight = svgHeight - plotMargin.top - plotMargin.bottom


    const GWASSVG = d3.select('#manhattan_plot_container').append('svg')
      .attr('id', 'gwas_svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .style('display', 'block')
      .style('margin', 'auto')

    const GWASPlot = GWASSVG.append('g')
      .attr('id', 'gwas_plot')
      .attr('transform', fmt(`translate(${plotMargin.left},${plotMargin.top})`))

    // Significance Threshold line
    const significance_threshold = 5e-8
    const significance_threshold_tooltip = d3Tip()
      .attr('class', 'd3-tip')
      .html('Significance Threshold: 5E-8')
      .offset([-8, 0])
    GWASSVG.call(significance_threshold_tooltip)

    const genomic_position_extent = (function () {
      const extent1 = d3.extent(variantBins, getGenomicPosition)
      const extent2 = d3.extent(unbinnedVariants, getGenomicPosition)
      return d3.extent(extent1.concat(extent2))
    })()

    const x_scale = d3.scaleLinear()
      .domain(genomic_position_extent)
      .range([0, plotWidth])
    unbinnedVariants.forEach(function (variant) {
      variant.pScaled = variant.mlogp || -Math.log10(variant.pval)
      if (variant.pScaled > vis_conf.loglog_threshold) {
        variant.pScaled = vis_conf.loglog_threshold * Math.log10(variant.pScaled) / Math.log10(vis_conf.loglog_threshold)
      }
    })

    variantBins.forEach(function (bin) {
      bin.neglog10_pval_extents.forEach(function (ext) {
        if (ext[0] > vis_conf.loglog_threshold) {
          ext[0] = vis_conf.loglog_threshold * Math.log10(ext[0]) / Math.log10(vis_conf.loglog_threshold)
        }
        if (ext[1] > vis_conf.loglog_threshold) {
          ext[1] = vis_conf.loglog_threshold * Math.log10(ext[1]) / Math.log10(vis_conf.loglog_threshold)
        }
      })
      bin.neglog10_pvals.forEach(function (pval, indx, arr) {
        if (pval > vis_conf.loglog_threshold) {
          arr[indx] = vis_conf.loglog_threshold * Math.log10(pval) / Math.log10(vis_conf.loglog_threshold)
        }

      })
    })

    // 1.03 puts points clamped to the top (pval=0) slightly above other points.
    const highest_plot_neglog10_pval = -1.03 *
      Math.min(Math.log10(significance_threshold * 0.8),
        (() => {
          const bestUnbinnedPValue : number = d3.min< UnbinnedVariant,number>(unbinnedVariants, (d) => (d.pScaled === 0) ? 1 : -d.pScaled);
          if(bestUnbinnedPValue === undefined){
	              return d3.max<VariantBin,number>(variantBins,  (bin) => d3.max(bin.neglog10_pvals));
          } else {
                return bestUnbinnedPValue;
          }
        })())

    const y_scale = d3.scaleLinear()
      .domain([highest_plot_neglog10_pval, 0])
      // 0.97 leaves a little space above points clamped to the top.
      .range([0, plotHeight * .97])
      .clamp(true)

    const color_by_chrom : ScaleOrdinal<string, unknown> = d3.scaleOrdinal()
      .domain(offsets.chroms)
      .range(vis_conf.manhattan_colors)

    GWASPlot.append('line')
      .attr('x1', 0)
      .attr('x2', plotWidth)
      .attr('y1', y_scale(-Math.log10(significance_threshold)))
      .attr('y2', y_scale(-Math.log10(significance_threshold)))
      .attr('stroke-width', '2px')
      .attr('stroke', 'lightgray')
      .attr('stroke-dasharray', '10,10')
      .on('mouseover', function(d) { significance_threshold_tooltip.show(d, this) })
      .on('mouseout', function(d) { significance_threshold_tooltip.hide(d, this) })

    const pointTooltip = d3Tip()
      .attr('class', 'd3-tip')
      .html(function (d) {
        const template = vis_conf.tooltip_template;
        const data = d.target.__data__ ;
        return mustacheText(template, reshape(data));
      })
      .offset([-6, 0])

    GWASSVG.call(pointTooltip);

    const getLinkToLZ = (variant)  => {
      const chromosome = variant.chrom;
      const startPosition = Math.max(0, variant.pos - 200 * 1000);
      const endPosition = variant.pos + 200 * 1000;
      return`/region/${phenotypeCode}/${chromosome}:${startPosition}-${endPosition}`;
    }

    GWASPlot.append('g')
      .attr('class', 'variant_hover_rings')
      .selectAll('a.variant_hover_ring')
      .data(unbinnedVariants)
      .enter()
      .append('a')
      .attr('class', 'variant_hover_ring')
      .attr('xlink:href', getLinkToLZ)
      .append('circle')
      .attr('cx', function (d) {
        return x_scale(getGenomicPosition(d))
      })
      .attr('cy', function (d) {
        return y_scale(d.pScaled)
      })
      .attr('r', 7)
      .style('opacity', 0)
      .style('stroke-width', 1)
      .on('mouseover', function (d) {
        //Note: once a tooltip has been explicitly placed once, it must be explicitly placed forever after.
        if (d.isDisabled !== true) {
          pointTooltip.show(d, this)
        }
      })
      .on('mouseout', pointTooltip.hide)

    GWASPlot.append('g')
      .attr('class', 'variant_points')
      .selectAll('a.variant_point')
      .data(unbinnedVariants)
      .enter()
      .append('a')
      .attr('class', 'variant_point')
      .attr('xlink:href', getLinkToLZ)
      .append('circle')
      .attr('id', function (d) {
        return `variant-point-${d.chrom}-${d.pos}-${d.ref}-${d.alt}`;
      })
      .attr('cx', function (d) {
        return x_scale(getGenomicPosition(d))
      })
      .attr('cy', function (d) {
        return y_scale(d.pScaled)
      })
      .attr('r', 2.3)
      .style('fill', function (d) {
        return color_by_chrom(d.chrom) as unknown as string; // TODO
      })
      .on('mouseover', function (d) {
        if (d.isDisabled !== true) {
          //Note: once a tooltip has been explicitly placed once, it must be explicitly placed forever after.
          pointTooltip.show(d, this)
        }
      })
      .on('mouseout', pointTooltip.hide)

    // https://stackoverflow.com/questions/38233003/d3-js-v4-how-to-access-parent-groups-datum-index
    var bins = GWASPlot.append('g')
      .attr('class', 'bins')
      .selectAll('g.bin')
      .data(variantBins)
      .enter()
      .append('g')
      .attr('class', 'bin')
      .attr('data-index', (d, i) => i)
      .each(function (d) { //todo: do this in a forEach
        d.x = x_scale(getGenomicPosition(d))
        d.color = color_by_chrom(d.chrom) as string
      })
    bins.selectAll('circle.binned_variant_point')
      .data((d) => d.neglog10_pvals)
      .enter()
      .append('circle')
      .attr('class', 'binned_variant_point')
      .attr('cx', function (d, i) {
        const parent_i = +this.parentElement.getAttribute('data-index')
        return variantBins[parent_i].x
      })
      .attr('cy',(neglog10_pval) => y_scale(neglog10_pval))
      .attr('r', 2.3)
      .style('fill', function (d, i) {
        const parent_i = +this.parentElement.getAttribute('data-index')
        return variantBins[parent_i].color
      })
    bins.selectAll('circle.binned_variant_line')
      .data(_.property('neglog10_pval_extents'))
      .enter()
      .append('line')
      .attr('class', 'binned_variant_line')
      .attr('x1', function (d, i) {
        const parent_i = +this.parentElement.getAttribute('data-index')
        return variantBins[parent_i].x
      })
      .attr('x2', function (d, i) {
        const parent_i = +this.parentElement.getAttribute('data-index')
        return variantBins[parent_i].x
      })
      .attr('y1', function (d) { return y_scale(d[0]) })
      .attr('y2', function (d) { return y_scale(d[1]) })
      .style('stroke', function (d, i) {
        const parent_i = +this.parentElement.getAttribute('data-index')
        return variantBins[parent_i].color
      })
      .style('stroke-width', 4.6)
      .style('stroke-linecap', 'round')

    // Axes

    const yAxis = d3.axisLeft(y_scale)
      .ticks(
        function (d: d3.NumberValue, index: number) : number {
          const x = d.valueOf();
          return (x <= vis_conf.loglog_threshold) ? x : Math.round(Math.pow(vis_conf.loglog_threshold, x / vis_conf.loglog_threshold))
        })

    GWASPlot.append('g')
      .attr('class', 'y axis')
      .attr('transform', 'translate(-8,0)') // avoid letting points spill through the y axis.
      .call(yAxis)

    GWASSVG.append('text')
      .style('text-anchor', 'middle')
      .attr('transform',
        `translate(${plotMargin.left * .4},${plotHeight / 2 + plotMargin.top})rotate(-90)`)
      .text('-log\u2081\u2080(p-value)')

    const chroms_and_midpoints = (function () {
      const v = offsets
      return v.chroms.map(function (chrom) {
        return {
          chrom: chrom,
          midpoint: v.chrom_genomic_start_positions[chrom] + (v.chrom_extents[chrom][1] - v.chrom_extents[chrom][0]) / 2
        }
      })
    })()

    GWASSVG.selectAll('text.chrom_label')
      .data(chroms_and_midpoints)
      .enter()
      .append('text')
      .style('text-anchor', 'middle')
      .attr('transform', function (d) {
        const xValue = plotMargin.left + x_scale(d.midpoint);
        const yValue = plotHeight + plotMargin.top + 20;
        return `translate(${xValue},${yValue})`;
      })
      .text(function (d) {
        return d.chrom
      })
      .style('fill',
        (d) => color_by_chrom(d.chrom) as string
      )


  }
  $(renderPlot);
}
interface Reshaped {
  cpra? : string
  rsids? : string
  nearestGenes? : string
  pheno? : string
  pvalue? : string
  mlogp? : string
  beta? : string
  or? : string
  af_alt? : string
  af_alt_cases? : string
  af_alt_controls? : string
  maf? : string
  maf_cases? : string
  maf_controls? : string
  af? : string
  ac? : string
  r2? : string
  tstat? : string
  n_cohorts? : string
  n_hom_cases? : string
  n_hom_ref_cases? : string
  n_het_cases? : string
  n_hom_controls? : string
  n_hom_ref_controls? : string
  n_het_controls? : string
  n_case? : string
  n_control? : string
  num_samples? : string
}

const reshape = (d) => {
  const result : Reshaped = {}

  if(d.chrom && (typeof d.pos === 'number') && d.ref && d.alt){
    result.cpra = `${d.chrom}:${d.pos.toLocaleString()} ${d.ref} / ${d.alt}`
  }
  if(typeof d.rsids === 'string'){
    result.rsids = d.rsids.split(',').join(' ')
  }
  if(typeof d.nearest_genes === 'string') {
    result.nearestGenes = d.nearest_genes.includes(',') ? `"${d.nearest_genes}"` : d.nearest_genes
  }
  if(typeof d.pheno === 'string') {
    result.pheno = d.pheno
  }
  if(typeof d.pval === 'number'){
    result.pvalue = scientificFormatter(d.pval)
  }
  if(typeof d.mlogp === 'number'){
    result.mlogp = scientificFormatter(d.mlogp)
  }
  if(typeof d.beta === 'number'){
    result.beta = scientificFormatter(d.beta)
  }
  if(typeof d.or === 'number'){
    result.or = scientificFormatter(d.or)
  }
  if(typeof d.af_alt === 'number'){
    result.af_alt = scientificFormatter(d.af_alt)
  }
  if(typeof d.af_alt_cases === 'number'){
    result.af_alt_cases = numberFormatter(d.af_alt_cases)
  }
  if(typeof d.af_alt_controls === 'number'){
    result.af_alt_controls = numberFormatter(d.af_alt_controls)
  }
  if(typeof d.maf === 'number'){
    result.maf = numberFormatter(d.maf)
  }
  if(typeof d.maf_cases === 'number'){
    result.maf_cases = numberFormatter(d.maf_cases)
  }
  if(typeof d.maf_controls === 'number'){
    result.maf_controls = numberFormatter(d.maf_controls)
  }
  if(typeof d.af === 'number'){
    result.af = scientificFormatter(d.af)
  }
  if(typeof d.ac === 'number'){
    result.ac = numberFormatter(d.ac)
  }
  if(typeof d.r2 === 'number'){
    result.r2 = numberFormatter(d.r2)
  }
  if(typeof d.tstat === 'number'){
    result.tstat = numberFormatter(d.tstat)
  }
  if(typeof d.n_cohorts === 'number'){
    result.n_cohorts = numberFormatter(d.n_cohorts)
  }
  if(typeof d.n_hom_cases === 'number'){
    result.n_hom_cases = numberFormatter(d.n_hom_cases)
  }
  if(typeof d.n_hom_ref_cases === 'number'){
    result.n_hom_ref_cases = numberFormatter(d.n_hom_ref_cases)
  }
  if(typeof d.n_het_cases === 'number'){
    result.n_het_cases = numberFormatter(d.n_het_cases)
  }
  if(typeof d.n_hom_controls === 'number'){
    result.n_hom_controls = numberFormatter(d.n_hom_controls)
  }
  if(typeof d.n_hom_ref_controls === 'number'){
    result.n_hom_ref_controls = numberFormatter(d.n_hom_ref_controls)
  }
  if(typeof d.n_het_controls === 'number'){
    result.n_het_controls = numberFormatter(d.n_het_controls)
  }
  if(typeof d.n_case === 'number'){
    result.n_case = numberFormatter(d.n_case)
  }
  if(typeof d.n_control === 'number'){
    result.n_control = numberFormatter(d.n_control)
  }
  if(typeof d.num_samples === 'number'){
    result.num_samples = numberFormatter(d.num_samples)
  }
  return result;
}




export { createGWASPlot }

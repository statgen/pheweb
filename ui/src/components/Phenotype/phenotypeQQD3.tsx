import { QQPlotParam } from "./phenotypeModel";
import * as d3 from "d3";
import _ from 'underscore'

const QQCITrumpetPoints = [
  [8.41463191637995e-08, 2.06937091984728e-07, 1.42026694351221e-09],
  [2.66180636288143e-01, 2.66462030395762e-01, 2.65899337287824e-01],
  [5.6721068372407e-01, 5.67712677422238e-01, 5.66708883205101e-01],
  [8.68240782931961e-01, 8.69013887987563e-01, 8.67468067199388e-01],
  [1.16927098568384e+00, 1.17040644058532e+00, 1.16813631239316e+00],
  [1.4703013955239e+00, 1.47193629381956e+00, 1.46866806341512e+00],
  [1.77133221954124e+00, 1.77366493805335e+00, 1.76900263637013e+00],
  [2.07236387191668e+00, 2.07567792384905e+00, 2.06905609364153e+00],
  [2.37339718102252e+00, 2.37809579805874e+00, 2.36871111430798e+00],
  [2.67443380364607e+00, 2.68108942684051e+00, 2.66780328423004e+00],
  [2.97547705353256e+00, 2.98490200133311e+00, 2.96610231693523e+00],
  [3.27653355885515e+00, 3.28988107575576e+00, 3.26328647005259e+00],
  [3.57761657869133e+00, 3.59652585605225e+00, 3.55890817139793e+00],
  [3.87875264212526e+00, 3.90555820542648e+00, 3.85234886553959e+00],
  [4.17999485107561e+00, 4.21803168233452e+00, 4.14276177058554e+00],
  [4.48144958465306e+00, 4.5355039743129e+00, 4.42900339626155e+00],
  [4.78333030435382e+00, 4.86032012266057e+00, 4.70955967275273e+00],
  [5.08606676383181e+00, 5.19610062771554e+00, 4.98248235352387e+00],
  [5.39052993533419e+00, 5.54863456742877e+00, 5.24536812930765e+00],
  [5.6985087909535e+00, 5.92763839672079e+00, 5.49543716880598e+00],
  [6.01377922573209e+00, 6.35053910237972e+00, 5.72979481308295e+00],
  [6.34477244477351e+00, 6.85146752472168e+00, 5.94597606127947e+00],
  [6.71274923006811e+00, 7.5046496357087e+00, 6.14285724932233e+00],
  [7.18987048478777e+00, 8.48541433197784e+00, 6.32194607299163e+00]
]


export const createQQPlot = (mafRanges : QQPlotParam[]) => {
  mafRanges.forEach(function (maf_range, i) { maf_range.color = ['#E8580C', '#D20CE8', '#FF0000', '#FFAC0D'][i] })

  const root = document.getElementById("qq_plot_container");
  const runOnce = document.getElementById("qq_svg") != null;
  if(root == null || runOnce) return; // wait until page loaded
  const expMax = d3.max(mafRanges, function (maf_range) { return d3.max(maf_range.qq, (d) => d[0]) })
  const tmpMax = d3.max(mafRanges, function (maf_range) { return d3.max(maf_range.qq, (d) => d[1]) })

  // Constrain obs_max in [exp_max, 9.01]. `9.01` preserves the tick `9`.
  const obsMax = Math.max(expMax, Math.min(9.01, tmpMax))

  const plotMargin = {
    'left': 70,
    'right': 30,
    'top': 10,
    'bottom': 120
  }

  const svgWidth : number = root.clientWidth;

  const plotWidth = svgWidth - plotMargin.left - plotMargin.right
  // Size the plot to make things square.  This way, x_scale and y_scale should be exactly equivalent.
  const plotHeight = plotWidth / expMax * obsMax;
  const svgHeight = plotHeight + plotMargin.top + plotMargin.bottom

  const qq_svg = d3.select('#qq_plot_container').append('svg')
    .attr('id', 'qq_svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .style('display', 'block')
    .style('margin', 'auto')
  const qq_plot = qq_svg.append('g')
    .attr('id', 'qq_plot')
    .attr('transform', `translate(${plotMargin.left},${plotMargin.top})`)

  const x_scale = d3.scaleLinear()
    .domain([0, expMax])
    .range([0, plotWidth])
  const y_scale = d3.scaleLinear()
    .domain([0, obsMax])
    .range([plotHeight, 0])

  // "trumpet" CI path
  const area = d3.area<number[]>()
    .x( (d) => x_scale(d[0]))
    .y0((d) => y_scale(d[1] + .05))
    .y1((d) => y_scale(d[2] - .05));
  qq_plot.append('path')
    .attr('class', 'trumpet_ci')
    .datum(QQCITrumpetPoints)
    .attr('d',area)
    .style('fill', 'lightgray')

  // points
  qq_plot.append('g')
    .selectAll('g.qq_points')
    .data(mafRanges)
    .enter()
    .append('g')
    .attr('data-index', function (d, i) { return i })
    .attr('class', 'qq_points')
    .selectAll('circle.qq_point')
    .data((d) => d.qq)
    .enter()
    .append('circle')
    .attr('cx', function (d) { return x_scale(d[0]) })
    .attr('cy', function (d) { return y_scale(d[1]) })
    .attr('r', 1.5)
    .attr('fill', function (d, i) {
      const parentIndex = +this.parentElement.getAttribute('data-index')
      return mafRanges[parentIndex].color
    })

  const attempt_two_decimals =  (x : number) : string => {
    if (x >= 0.01) return x.toFixed(2)
    if (x >= 0.001) return x.toFixed(3)
    return x.toExponential(0)
  }

  // Legend
  qq_svg.append('g')
    .attr('transform', `translate(${plotMargin.left + plotWidth},${plotMargin.top + plotHeight + 70})`)
    .selectAll('text.legend-items')
    .data(mafRanges)
    .enter()
    .append('text')
    .attr('text-anchor', 'end')
    .attr('y', function (d, i) {
      return i + 'em'
    })
    .text(function (d) {
      const value1 = attempt_two_decimals(d.maf_range[0]);
      const value2 = attempt_two_decimals(d.maf_range[1])
      return `${value1} ≤ MAF < ${value2} (${d.count})`;
    })
    .attr('fill', (d) => d.color)
  /*

  */
  // Axes
  const xAxis = d3
    .axisBottom(x_scale)
    .tickSizeInner(-plotHeight) // this approach to a grid is taken from <http://bl.ocks.org/hunzy/11110940>
    .tickSizeOuter(0)
    .tickPadding(7)
    .tickFormat(d3.format('d')) //integers
    .tickValues(_.range(expMax))
    /*prevent unlabeled, non-integer ticks.
      https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp
     */
  qq_plot.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${plotHeight})`)
    .call(xAxis)

  var yAxis = d3
    .axisLeft(y_scale)
    .tickSizeInner(-plotWidth)
    .tickSizeOuter(0)
    .tickPadding(7)
    .tickFormat(d3.format('d')) //integers
    .tickValues(_.range(obsMax)) //prevent unlabeled, non-integer ticks.
  qq_plot.append('g')
    .attr('class', 'y axis')
    .call(yAxis)

  qq_svg.append('text')
    .style('text-anchor', 'middle')
    .attr('transform', `translate(${plotMargin.left * .4},${plotMargin.top + plotHeight / 2})rotate(-90)`)
    .text('observed -log\u2081\u2080(p)')

  qq_svg.append('text')
    .style('text-anchor', 'middle')
    .attr('transform', `translate(${plotMargin.left + plotWidth / 2},${plotMargin.top + plotHeight + 40})`)
    .text('expected -log\u2081\u2080(p)')
}


export default createQQPlot;
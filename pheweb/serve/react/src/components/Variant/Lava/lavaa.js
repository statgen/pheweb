import './style.css'
import React, { useState, useEffect } from 'react'
import * as d3module from 'd3'
import { tip as d3tip } from 'd3-v6-tip'

const d3 = {
  ...d3module,
  tip: d3tip
}

function Lavaa (props) {

  const [selection, setSelection] = useState([])
  const [ready, setReady] = useState(false) // set the initial state to be not ready

  const data = props.dataprop
  const colorByCategory = props.colorByCategory^M

  data.forEach((d)=> {
    d.n_case = d.n_case | d.num_case | d.af_alt_cases | d.maf_alt_cases;
    d.n_control = d.n_control | d.num_control | d.af_alt_controls | d.maf_alt_controls;
  })


  useEffect(() => {

    if (!ready) { // if not ready, then:
      setReady(true)

      // show zoom state buttons
      function showBtn () {
        const back = document.getElementById('button_back')
        back.style.display = 'block'
        const showZoomHull = document.getElementById('ZoomHull')
        showZoomHull.style.display = 'block'
      }

      // hide zoom state buttons
      function hideBtn () {
        const hideBack = document.getElementById('button_back')
        hideBack.style.display = 'none'
        const hideZoomHull = document.getElementById('ZoomHull')
        hideZoomHull.style.display = 'none'
      }

      // hide normal view buttons on zoom
      function hideBtns () {
        const  hide = document.getElementById('hideThese')
        hide.style.display = 'none'
        const hideHull = document.getElementById('hullCheckboxDiv')
        hideHull.style.display = 'none'
        const hideSig = document.getElementById('significanceCheckboxDiv')
        hideSig.style.display = 'none'
        var hidePip = document.getElementById('pipCheckboxDiv')
        hidePip.style.display = 'none'
      }

      //show normal view buttons on zoom
      function showBtnBlock () {
        var show = document.getElementById('hideThese')
        show.style.display = 'block'
        var showHull = document.getElementById('hullCheckboxDiv')
        showHull.style.display = 'block'
        var showSig = document.getElementById('significanceCheckboxDiv')
        showSig.style.display = 'block'
        var showPip = document.getElementById('pipCheckboxDiv')
        showPip.style.display = 'block'
      }

      //hide download image button, use before image is shown
      function showImgDownload () {
        var show = document.getElementById('downloadImg-block')
        show.style.display = 'block'
      }

      //show zoom clear selection button
      function showZoomClear () {
        var hide = document.getElementById('btn-block-toggle')
        hide.style.display = 'none'
        var show = document.getElementById('btn-block-2')
        show.style.display = 'block'
      }

      //hide zoom clear selection button
      function hideZoomClear () {
        var show = document.getElementById('btn-block-toggle')
        show.style.display = 'block'
        var hide = document.getElementById('btn-block-2')
        hide.style.display = 'none'
      }

      //toggle download button
      function myToggle () {
        var x = document.getElementById('download-options')
        if (x.style.display === 'none') {
          x.style.display = 'block'
        } else {
          x.style.display = 'none'
        }
      }

      //show legends
      function showLegends () {
        var showL = document.getElementById('labels-block')
        showL.style.opacity = '1'
      }

      function resetDiv () {
        var collapsed = document.getElementById('labels-block')
        collapsed.style.marginRight = '0vw'
        collapsed.style.width = '5vw'
        var showBtn = document.getElementById('button_legend')
        showBtn.style.display = 'block'
        var hideCollapseBtn = document.getElementById('buttonCollapse')
        hideCollapseBtn.style.display = 'none'
        // Get a NodeList of all elements
        const legendTexts = document.querySelectorAll('.label')
        // Change the visibility attr of multiple elements with a loop
        legendTexts.forEach(element => {
          element.style.visibility = 'hidden'
        })
      }

      function downloadCsvZoom () {
        //function to remove duplicate values from the array
        function removeDuplicates3 (selection4) {
          return selection4.filter((value, index) => selection4.indexOf(value) === index)
        }

        //make the header
        var data_export_csv_header = Object.keys(selection4[0]).join(), //gets data keys as strings
          rows = removeDuplicates3(selection4)
        //this is the core
        var data_export_csv_rows = rows.map(function (el) {
          return Object.values(el).join()
        }).join('\n')
        var data_export_csv = data_export_csv_header + '\n' + data_export_csv_rows //join header and rows
        /*https://riptutorial.com/javascript/example/24711/client-side-csv-download-using-blob*/
        var blob = new Blob([data_export_csv])
        if (window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveBlob(blob, 'tableData.csv')
        } else {
          var a = window.document.createElement('a') //empty element(link)
          a.href = window.URL.createObjectURL(blob, {
            type: 'text/plain'
          })
          //console.log(a.href, 'ciao');
          a.download = 'tableData.csv'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }
      }

/////////////////////////////////////////////////////
//////----the main function starts here---///////////
/////////////////////////////////////////////////////

      function volcano () {

        const selection2 = [] //an empty array where we can push brushed data
        const selection3 = [] //an empty array where we can push brushed data
        const selection4 = [] //an empty array where we can push brushed data
        function removeText () { //remove texts tagged with 'info' class
          d3.selectAll('p.info').remove()
        }

        function removeBrush2 () { //remove brush selection
          selection3.length = 0
        }

        function removeBrush3 () { //remove brush selection
          selection4.length = 0
        }

        //hideStartView();
        showImgDownload()
        hideDownloadOptions()
        showLegends()
        d3.select('.h2').remove()
        d3.select('#gLegContainer').remove()
        d3.select('#gLegContainer2').remove()
        document.getElementById('button_legend').onclick = function () {
          return expandDiv()
        }
        document.getElementById('hullCheckbox').onclick = function () {
          if (this.checked) {
            if (document.getElementById('significanceCheckbox').checked) {
              return showHull2()
            } else {
              return showHull()
            }
          } else {
            return hideHull()
          }
        }
        document.getElementById('hullCheckboxZoom').onclick = function () {
          if (this.checked) {
            return showHull3()
          } else {
            return hideHull()
          }
        }
        //show and hide convex hull with a checkbox
        document.getElementById('significanceCheckbox').onclick = function () {
          if (this.checked) {
            return redrawScale() // show significant ones
          } else {
            return overView() //return to normal state
          }
        }
        //show and hide pip with a checkbox
        document.getElementById('pipCheckbox').onclick = function () {
          if (this.checked) {
            if (document.getElementById('significanceCheckbox').checked) {
              return showPip2()
            } else {
              return showPip()
            } // show nodes with high pip-values
          } else {
            return hidePip() //hide pip indication
          }
        }

        function expandDiv () {
          var expanded = document.getElementById('labels-block')
          expanded.style.marginRight = '-50vw'
          expanded.style.width = '50vw'
          var hideBtn = document.getElementById('button_legend')
          hideBtn.style.display = 'none'
          var showCollapseBtn = document.getElementById('buttonCollapse')
          showCollapseBtn.style.display = 'block'
          document.getElementById('buttonCollapse').onclick = function () {
            return collapseDiv()
          }
          // Get a NodeList of all elements
          const legendTexts = document.querySelectorAll('.label')
          // Change the visibility attr of multiple elements with a loop
          legendTexts.forEach(element => {
            element.style.visibility = 'visible'
          })

          function collapseDiv () {
            var collapsed = document.getElementById('labels-block')
            collapsed.style.marginRight = '0vw'
            collapsed.style.width = '5vw'
            var showBtn = document.getElementById('button_legend')
            showBtn.style.display = 'block'
            var hideCollapseBtn = document.getElementById('buttonCollapse')
            hideCollapseBtn.style.display = 'none'
            // Get a NodeList of all elements
            const legendTexts = document.querySelectorAll('.label')
            // Change the visibility attr of multiple elements with a loop
            legendTexts.forEach(element => {
              element.style.visibility = 'hidden'
            })
          }
        } //end of expand-collapse

        function goBack () {
          overView()
          showBtnBlock()
        }

        function removeBrush () { //remove brush selection
          selection2.length = 0
        }

        function removeBrush2 () { //remove brush selection
          selection3.length = 0
        }

        function removeBrush3 () { //remove brush selection
          selection4.length = 0
        }

        function clearSelections () {
          removeText()
          removeBrush()
          removeBrush2()
          removeBrush3()
        }

        document.getElementById('button_styled').onclick = function () {
          return clearSelections()
        }
        document.getElementById('button_styled-2').onclick = function () {
          return clearSelections()
        }
        document.getElementById('button_back').onclick = function () {
          return goBack()
        }

        //setting values for the viewBox
        const heightValue = 330
        const widthValue = 320

        const svg = d3.select('#chartInner').append('svg')
          .attr('viewBox', `2 -10 320 330`)
          .attr('stroke-width', '0.3')
        const margin = {
          top: 50,
          bottom: 50,
          left: 40,
          right: 2
        }
        const chart = svg.append('g').attr('transform', `translate(${margin.left},0)`)
        const width = 320 - margin.left - margin.right //width of the chart
        const height = 330 - margin.top - margin.bottom //height of the chart

        //create an svg for legend container since it's outside of the chart div
        const svg2 = d3.select('#labels-block').append('svg').attr('id', 'gLegContainer')
        //.attr("width", 500).attr("height", height * 2.1); //width and height of the inner svg, doesn't affect the div
        const legendBlockVar = svg2.append('g').attr('transform', `translate(${margin.right},0)`)

        const f = d3.format('.1f')

        //Initiating Y- and color-scales
        var yScale = d3.scaleLog()
        var yScale2 = d3.scaleLog()
        var yScale3 = d3.scaleLog()
        /*const colorScale = d3.scaleOrdinal().range(d3.schemeTableau10)*/
        const colorScale = (v) => colorByCategory[v]^M
        const colorValue = d => d.category //Color value by category
        /*const colorScale2 = d3.scaleOrdinal().range(d3.schemeTableau10)*/
        //getting max and min y (p-value) values
        var max = d3.max(data, function (d) {
          return d.pval
        })
        var min = d3.min(data, function (d) {
          return d.pval
        })
        //max for the case numbers
        var maxCases = d3.max(data, function (d) {
          return d.n_case
        })
        //create two Yscales with different ranges
        yScale.domain([min, max])
          .range([0, height]).nice()
        yScale2.domain([0.0000001, max + 5]) //padding to the bottom
          .range([200, 250])
        //extra y-scale for showing only significant values
        yScale3.domain([min, 0.0000001]).range([0, height]).nice()
        //getting max and min x (beta) values
        var betaMax = d3.max(data, function (d) {
          return d.beta
        })
        var betaMin = d3.min(data, function (d) {
          return d.beta
        })
        //get min and max beta from significant ones
        var betaMax2 = d3.max(data, function (d) {
          if (d.pval <= 0.0000001) {
            return d.beta
          }
        })
        var betaMin2 = d3.min(data, function (d) {
          if (d.pval <= 0.0000001) {
            return d.beta
          }
        })
        var biggerBeta = d3.max(data, function (d) {
          if (betaMax > betaMin * (-1)) {
            return betaMax
          } else {return betaMin * (-1)}
        })
        //create x-scale
        var xScale = d3.scaleLinear().domain([biggerBeta * (-1) - 0.1, biggerBeta + 0.1]) //make x-scale symmetrical
          .range([0, width])
        var xScale2 = d3.scaleLinear().domain([betaMin2 - 0.1, betaMax2 + 0.1]).range([0, width])
        //initializing square root scale for scaling datapoint size
        var sqrtScale = d3.scaleSqrt().domain([0, maxCases]).range([2, 10]) //only allow a slight change in values since variation is huge
        //trigger a function with enter. https://stackoverflow.com/questions/40252637/keypress-trigger-a-function-if-specific-pressed
        function checkKey (e) {
          var key = e.which || e.keyCode
          if (key === 13) zooming()
          showBtn()
          hideBtns()
          removeText() //on enter zoom, remove old selection text and switch button view
        }

        document.addEventListener('keypress', checkKey)
        //Append the X Axis
        chart.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale).ticks(5).tickSize(-height))
          //adjust tick labels
          .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5)
        //Append the Y Axis
        chart.append('g').attr('transform', `translate(0, 0)`).call(d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-width))
          //adjust tick labels
          .selectAll('text').attr('class', 'yTickLabel').style('font-size', '0.5em').style('opacity', 0.5)
          .text(function (d) {
            return d === 1 ? d : d.toExponential().replace('1e-', '')
          })
        //add labels
        chart.append('text')
          .text('-log10 p-value')
          .attr('x', 20)
          .attr('y', height / 1.8)
          .attr('transform', 'translate(-150,150) rotate(-90)')
          .attr('class', 'axisLabel')
          .style('font-size', '0.4em')
          .style('font-family', 'sans-serif')
        chart.append('text')
          .attr('x', width / 2)
          .attr('y', height * 1.08)
          .attr('class', 'axisLabel')
          .style('text-anchor', 'middle')
          .text('beta value')
          .style('font-size', '0.4em')
          .style('font-family', 'sans-serif')
        //lightly color the zero side of the x-axis
        chart.append('rect')
          .attr('height', height)
          .attr('width', xScale(0))
          .attr('fill', 'lightgray')
          .attr('opacity', 0.2)
        d3.selectAll('g.tick')
          .select('line')
          .style('stroke-width', 0.1)
          .style('opacity', 0.5)
        chart.append('line')
          .attr('x1', 0)
          .attr('y1', yScale(0.0000001))
          .attr('x2', width)
          .attr('y2', yScale(0.0000001))
          .style('stroke', 'grey')
          .style('stroke-dasharray', ('3, 3'))
          .style('stroke-width', 0.5)
        //set up the tooltip
        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-5, 0])
          .html((event, d) => {
          return d.category + '<br>' + '<br>' + d.phenostring + '<br>' + '<br>' + 'p-value: ' + d.pval + '<br>' + 'beta value: ' + d.beta + '<br>' + 'cases / controls: ' + d.n_case + ' / ' + d.n_control + '<br>' + 'pip: ' + d.pip
        })
        svg.call(tip)

///////////////////--bigger background dots--//////////////////////

        var g = svg.append('g') //make a new g element to which we append circles
          .attr('id', 'dataPoints').selectAll('g').data(data).enter().append('g')
        g.append('circle').attr('cx', function (d) {
          return xScale(d.beta) + 40
        }) //+margin-left amount
          .attr('cy', function (d) {
            return yScale(d.pval)
          })
          .attr('r', d => sqrtScale(d.n_case))
          .style('pointer-events', 'none') //disable hover effects
          .style('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.1
            } else {
              return 'opacity', 0.2
            }
          }).attr('fill', d => colorScale(colorValue(d))) //color by category

///////////////////////////--add dots--////////////////////////////

        g.append('circle').attr('cx', function (d) {
          return xScale(d.beta) + 40
        }) //+margin-left amount
          .attr('cy', function (d) {
            return yScale(d.pval)
          }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'circleCenter')
          .attr('r', 2).attr('stroke', 'white').attr('opacity', function (d) {
          if (d.pval >= 0.0000001) {
            return 'opacity', 0.4
          } else {
            return 'opacity', 1
          }
        }).attr('fill', d => colorScale(colorValue(d)))


          ////////////////////--hover events--////////////////////////////////

          //tooltip
          .on('mouseover.tip', tip.show, function () {
            d3.select(this).transition().duration('100')
          }).on('mouseout.tip', tip.hide)
          //highlight color
          .on('mouseover.color', function () {
            d3.select(this).transition().duration('200').style('opacity', 1)
              .attr('r', d => sqrtScale(d.n_case))
          }).on('mouseout.color', function () {
          d3.select(this).transition().duration('200').style('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.4
            } else {
              return 'opacity', 1
            }
          }).attr('r', 2)
        })
          //add labels on click, mostly credit to Nicola
          .on('click', function (e, d) {
            var x = parseFloat(d3.select(this).attr('cx')),
              y = parseFloat(d3.select(this).attr('cy'))
            //format the case number with a comma separator
            let format = d3.format(',')
            let formattedCases = format(d.n_case)
            const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
            label.append('line')
              .attr('x1', 0)
              .attr('y1', -2.5)
              .attr('x2', -10)
              .attr('y2', -10)
              .style('stroke-width', '0.5px')
              .style('stroke', '#d3d3d3')
            label.append('text')
              .style('font-size', '5px')
              .style('font-family', 'sans-serif')
              .style('cursor', 'grab')
              .text(d.phenostring)
              .call(d3.drag()

                .on('start', dragLabelStarted))
            //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
            label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
              //tspan in a separate line
              .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
          })
          //reset labels on double-click
          .on('dblclick', function () {
            labelLayer.selectAll('*').remove()
          })

//////////////////////--labels--//////////////////////////////////////

        var newData = data.filter(d => d.pval <= 0.0000001)
        //categoryData = data.filter(d => d.category == 'Diseases marked as autimmune origin')
        //https://wsvincent.com/javascript-remove-duplicates-array/, this method found from the chat belove the post
        const unique = []
        newData.map(x => unique.filter(a => a.category == x.category && a.category == x.category).length > 0 ? null : unique.push(x))
        //Initialize data
        var chartData = unique
        //Initialize legend
        var clicked = ''
        var legendItemSize = 8
        var legendSpacing = 20
        var xOffset = 10
        var yOffset = 10
        //var labelsBlock = d3.select('#labels-block')
        var gLeg = legendBlockVar.selectAll('g').data(chartData).enter().append('g')
        gLeg.append('circle').style('fill', d => colorScale(colorValue(d))).attr('r', legendItemSize).attr('transform', (d, i) => {
          var x = xOffset
          var y = yOffset + (legendItemSize + legendSpacing) * i
          return `translate(${x}, ${y})`
        })
        gLeg.append('text').attr('class', 'label').attr('x', xOffset + legendItemSize + 5).attr('y', (d, i) => yOffset + (legendItemSize + legendSpacing) * i + 5).text(d => d.category)
        ////////////////////////////////////////////////////////////////////
        //attaching click to the legend text for now
        gLeg.on('mouseover.legend', function (d) {
          d3.selectAll('.newCircleCenter').remove()
          var legendText = this.textContent //get the text of the legend in a variable
          var HighlightData = data.filter(d => d.category == legendText) //get the data objects associated with the legend
          d3.selectAll('.circleCenter').style('opacity', 0.1) //on any click set all centers to hidemode
          //.style('pointer-events', 'none')
          //Append new circles
          var g = svg.append('g').selectAll('g').data(HighlightData).enter().append('g')
          g.append('circle').attr('cx', function (d) {
            return xScale(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale(d.pval)
          }).attr('fill', d => colorScale(colorValue(d)))
            .attr('class', 'newCircleCenter')
            .attr('r', 2)
            .attr('stroke', 'white')
            .attr('opacity', 1)
            .attr('fill', d => colorScale(colorValue(d)))
            //tooltip
            .on('mouseover.tip', tip.show, function () {
              d3.select(this).transition().duration('100')
            }).on('mouseout.tip', tip.hide)
            //highlight color
            .on('mouseover.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
            }).on('mouseout.color', function () {
            d3.select(this).transition().duration('200').style('opacity', 1).attr('r', 2)
          })
            //add labels on click, mostly credit to Nicola
            .on('click', function (e, d) {
              var x = parseFloat(d3.select(this).attr('cx')),
                y = parseFloat(d3.select(this).attr('cy'))
              //format the case number with a comma separator
              let format = d3.format(',')
              let formattedCases = format(d.n_case)
              const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
              label.append('line').attr('x1', 0).attr('y1', -2.5).attr('x2', -10).attr('y2', -10).style('stroke-width', '0.5px').style('stroke', '#d3d3d3')
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').style('cursor', 'grab').text(d.phenostring).call(d3.drag().on('start', dragLabelStarted))
              //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
                //tspan in a separate line
                .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
            })
            //reset labels on double-click
            .on('dblclick', function () {
              labelLayer.selectAll('*').remove()
            })
          //highlight selected gLeg group
          d3.selectAll(gLeg).style('opacity', 0.5)
          d3.select(this).style('opacity', 1)
        }) //end of click
        //double-click anywhere on the labels block
        var labelsBlock = d3.select('#labels-block')
        labelsBlock.on('mouseout.legend', function (d) {
          //reset circlecenter opacity
          d3.selectAll('.circleCenter').style('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.4
            } else {
              return 'opacity', 1
            }
          })
          //remove highlights
          d3.selectAll('.newCircleCenter').remove()
          //legend items back to full opacity
          d3.selectAll(gLeg).style('opacity', 1)
        })

//////////////////////--brushing--/////////////////////////

        //help from https://peterbeshai.com/blog/2016-12-03-brushing-in-scatterplots-with-d3-and-quadtrees/
        //const selection2 = [];//an empty array where we can push data
        const brush = d3.brush().extent([
          [0, 0],
          [width, height]
        ]) //stay within the chart and above the significance
        //attach the brush to the chart
        const gBrush = chart.append('g').attr('class', 'brush').call(brush)
        //column setup for the brushed data
        const table = d3.select('#info-column')
        const categoryCol = d3.select('#category')
        const phenoCol = d3.select('#phenotype')
        const pvalCol = d3.select('#pval')
        const betaCol = d3.select('#beta')
        const caseCol = d3.select('#case-control')
        //brush event inside the first state
        brush.on('end', function (event, d) {
          const selection = event.selection //the scope of the brush
          d3.selectAll('circle').each(function (d) { //go through the points
            if (selection && yScale(d.pval) > selection[0][1] && yScale(d.pval) < selection[1][1] && xScale(d.beta) > selection[0][0] && xScale(d.beta) < selection[1][0]) {
              selection2.push(d) //push data to the empty array
            }
          })

          //function to remove duplicate values from the array
          function removeDuplicates (selection2) {
            return selection2.filter((value, index) => selection2.indexOf(value) === index)
          }

          //console.log(removeDuplicates(selection2))
          categoryCol.selectAll('p')
            .data((removeDuplicates(selection2)))
            .enter()
            .append('div')
            .attr('class', 'myScroll')
            .style('overflow-x', 'auto')
            .append('p')
            .attr('class', 'info')
            .html(function (d) {
              return d.category
            })

          phenoCol.selectAll('p')
            .data((removeDuplicates(selection2)))
            .enter()
            .append('div')
            .attr('class', 'myScroll')
            .style('overflow-x', 'auto')
            .attr('id', 'row')
            .append('p')
            .attr('class', 'info')
            .attr('x', 10)
            .attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
            return d.phenostring
          })
          pvalCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('class', 'myScroll').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
            return i * 12
          }).html(function (d) {
            return d.pval
          })
          betaCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('class', 'myScroll').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
            return i * 12
          }).html(function (d) {
            return d.beta
          })
          caseCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('class', 'myScroll').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
            return i * 12
          }).html(function (d) {
            return d.n_case + ' / ' + d.n_case
    
          })
          setSelection(selection2)
        })

        /////////////////////--csv download--///////////////////////////
        function downloadCsv () {
          //function to remove duplicate values from the array
          function removeDuplicates (selection2) {
            return selection2.filter((value, index) => selection2.indexOf(value) === index)
          }

          //make the header
          var data_export_csv_header = Object.keys(selection2[0]).join(), //gets data keys as strings
            rows = removeDuplicates(selection2)
          //this is the core
          var data_export_csv_rows = rows.map(function (el) {
            return Object.values(el).join()
          }).join('\n')
          var data_export_csv = data_export_csv_header + '\n' + data_export_csv_rows //join header and rows
          /*https://riptutorial.com/javascript/example/24711/client-side-csv-download-using-blob*/
          var blob = new Blob([data_export_csv])
          if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, 'tableData.csv')
          } else {
            var a = window.document.createElement('a') //empty element(link)
            a.href = window.URL.createObjectURL(blob, {
              type: 'text/plain'
            })
            //console.log(a.href, 'ciao');
            a.download = 'tableData.csv'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }
        }

        document.getElementById('button_styled_download').onclick = function () {
          return downloadCsv()
        }

/////////////////////--convex hull--////////////////////////////////

        function showHull () { // wrapped the hull in a function
          //convex hull code by Nicola
          var hullPoints = [] //create empty array where to store datapoints
          const groups = d3.groups(data, function (d) {
            return d.category //grouping done by categories, returns an array
          }).filter(function (G) {
            const groupsize = G[1].filter(function (g) {
              return g.pval < 0.0000001
            }).length
            if (groupsize > 0) {
              return G
            }
          })
          groups.forEach(e => {
            const group = e[1]
            group.forEach((d, i) => {
              hullPoints[i] = [xScale(d.beta) + 40, yScale(d.pval)]
            })
            const hull = d3.polygonHull(hullPoints)
            const color = colorScale(e[0])
            if (hull) {
              svg.append('path').attr('class', 'hullPath').attr('d', 'M' + hull.join('L') + 'Z') //generates the line; M-moveto a specific point, L-lineto a specificpoint, Z-closepath. hull joined by a lineto
                .attr('stroke', color).attr('stroke-width', 0.25).attr('fill', color).attr('fill-opacity', 0.1).style('pointer-events', 'none') //disable hover effects
            }
            hullPoints = [] //refresh the array
          })
        }

/////////////////////--convex hull 2--////////////////////////////////

        function showHull2 () {
          var hullPoints = [] //create empty array where to store datapoints
          const groups = d3.groups(newData, function (d) {
            return d.category //grouping done by categories, returns an array
          })
          //convex hull code by Nicola
          groups.filter(function (G) {
            const groupsize = G[1].filter(function (g) {
              return g.pval < 0.0000001
            }).length
            if (groupsize > 0) {
              return G
            }
          }).forEach(e => {
            const group = e[1]
            group.forEach((d, i) => {
              if (d.pval <= 0.0000001) {
                hullPoints[i] = [xScale2(d.beta) + 40, yScale3(d.pval)]
              }
            })
            const hull = d3.polygonHull(hullPoints)
            const color = colorScale(e[0])
            if (hull) {
              svg.data(hull).append('path').attr('class', 'hullPath').attr('d', 'M' + hull.join('L') + 'Z') //generates the line; M-moveto a specific point, L-lineto a specificpoint, Z-closepath. hull joined by a lineto
                .attr('stroke', color).attr('stroke-width', 0.25).attr('fill', color).attr('fill-opacity', 0.1).style('pointer-events', 'none') //disable hover effects
            }
            hullPoints = [] //refresh the hullpoints array in the end of the loop
          })
        }

/////////////////////--convex hull 3 for zoom--///////////////////

        function showHull3 () {
          //get min and max p values from selection for zooming
          var pMax2 = d3.max(selection2, function (d) {
            return d.pval
          })
          var pMin2 = d3.min(selection2, function (d) {
            return d.pval
          })
          var yScale4 = d3.scaleLog().domain([pMin2 - (pMin2 / 1.001), pMax2 + (pMax2 * 2)]).range([0, height]).nice()
          //get min and max beta from selection for zooming
          var betaMax3 = d3.max(selection2, function (d) {
            return d.beta
          })
          var betaMin3 = d3.min(selection2, function (d) {
            return d.beta
          })
          var xScale3 = d3.scaleLinear()
            //.domain([betaMin3-(betaMax3),betaMax3+(betaMin3*(-1))])
            .domain([betaMin3 - 0.1, betaMax3 + 0.1]).range([0, width])
          var hullPoints = [] //create empty array where to store datapoints
          const groups = d3.groups(selection2, function (d) {
            return d.category //grouping done by categories, returns an array
          })
          //convex hull code by Nicola
          groups.filter(function (G) {
            const groupsize = G[1].filter(function (g) {
              return g.pval < 0.0000001
            }).length
            if (groupsize > 0) {
              return G
            }
          }).forEach(e => {
            const group = e[1]
            group.forEach((d, i) => {
              hullPoints[i] = [xScale3(d.beta) + 40, yScale4(d.pval)]
            })
            const hull = d3.polygonHull(hullPoints)
            const color = colorScale(e[0])
            if (hull) {
              svg.data(hull).append('path').attr('class', 'hullPath').attr('d', 'M' + hull.join('L') + 'Z') //generates the line; M-moveto a specific point, L-lineto a specificpoint, Z-closepath. hull joined by a lineto
                .attr('stroke', color).attr('stroke-width', 0.25).attr('fill', color).attr('fill-opacity', 0.1).style('pointer-events', 'none') //disable hover effects
            }
            hullPoints = [] //refresh the hullpoints array in the end of the loop
          })
        }

        //hide the convex hull
        function hideHull () {
          svg.selectAll('.hullPath').remove()
          //still need to remove the checkmark from the box on toggle
        }

        function removeText () { //remove texts tagged with 'info' class
          d3.selectAll('p.info').remove()
        }

///////////////////--highlight pip--//////////////////////

        var subset = data.filter(d => d.pip >= 0.1) //pip values bigger or equal to 0.1
        var subset2 = data.filter(d => d.pip > 0 && d.pip < 0.1) //pip values bigger than zero but smaller than 0.1
        //console.log(subset2)//subset 2 doesn't have anything for this dataset apparently
        function showPip () {
          svg.selectAll('.dot').data(subset).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
            return xScale(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale(d.pval)
          }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('stroke-width', 0.7).style('opacity', 1).style('pointer-events', 'none')
        }

        function showSmallPip () {
          svg.selectAll('.dot').data(subset2).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
            return xScale(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale(d.pval)
          }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('stroke-width', 0.5).style('opacity', 1).style('pointer-events', 'none')
        }

        //for significant ones
        function showPip2 () {
          svg.selectAll('.dot').data(subset).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
            return xScale2(d.beta) + 40
          }).attr('cy', function (d) {
            if (d.pval <= 0.0000001) {
              return yScale3(d.pval)
            }
          }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('stroke-width', 0.7).style('opacity', 1).style('pointer-events', 'none')
        }

        function showSmallPip2 () {
          svg.selectAll('.dot')
            .data(subset2)
            .enter()
            .append('circle')
            .attr('r', 2)
            .attr('class', 'pipdot')
            .attr('cx', function (d) {
              return xScale2(d.beta) + 40
            }).attr('cy', function (d) {
            if (d.pval <= 0.0000001) {
              return yScale3(d.pval)
            }
          }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('stroke-width', 0.5).style('opacity', 1).style('pointer-events', 'none')
        }

        function hidePip () {
          d3.selectAll('circle.pipdot').remove()
        }

///////////////////////////////////////////////////////
///////////////////--overview state--//////////////////
////////////////////////////////////////////////////////

        function overView () {
          resetDiv()
          clearSelections()
          hideBtn()
          hideZoomClear()
          //interactiveLabels();
          //create an svg for legend container since it's outside of the chart div
          const svg3 = d3.select('#labels-block').append('svg').attr('id', 'gLegContainer')
          //.attr("width", 500).attr("height", height * 2.1); //width and height of the inner svg, doesn't affect the div
          const legendBlockVar2 = svg3.append('g') //another one for overView()
          //enable the enter-zoom in overview state
          //trigger a function with enter. https://stackoverflow.com/questions/40252637/keypress-trigger-a-function-if-specific-pressed
          function checkKey (e) {
            var key = e.which || e.keyCode
            if (key === 13) zooming()
            showBtn()
            hideBtns()
            removeText() //on enter zoom, remove old selection text and switch button view
          }

          document.addEventListener('keypress', checkKey)
          //remove old stuff
          svg.selectAll('.hullPath').remove()
          svg.select('rect') //avoid multiple shading rects on top of each other
            .remove()
          d3.selectAll('g.tick') //remove ticks
            .remove()
          d3.selectAll('.circleCenter') //remove circles
            .remove()
          d3.selectAll('.newCircleCenter') //remove highlights
            .remove()
          d3.selectAll('.circleBackground').remove()
          d3.selectAll('path.domain') //remove double scale lines
            .remove()
          d3.selectAll('line').remove()
          d3.selectAll('.annotation-label').remove()
          d3.selectAll('.annotation-rect').remove()
          d3.selectAll('text.axisLabel').remove()
          d3.select('g.brush').remove() //remove old brush while changing the view
          d3.selectAll('.legendContainer') //remove old legend
            .remove()
          d3.select('#gLegContainer').remove()
          d3.selectAll('#gLegContainer3') //remove legend block from zoomm
            .remove()
          d3.selectAll('#gLegContainer4') //remove legend block from significance view
            .remove()
          labelLayer.selectAll('*') //remove legend block from significance view
            .remove()
          //Append the X Axis
          chart.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale).ticks(5).tickSize(-height))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5)
          //Append the Y Axis
          chart.append('g').attr('transform', `translate(0, 0)`).call(d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-width))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5).text(function (d) {
            return d === 1 ? d : d.toExponential().replace('1e-', '')
          })
          //lightly color the zero side of the x-axis
          chart.append('rect')
            .attr('height', height)
            .attr('width', xScale(0))
            .attr('fill', 'lightgray')
            .attr('opacity', 0.2)
          d3.selectAll('g.tick')
            .select('line').style('stroke-width', 0.1).style('opacity', 0.5)
          chart.append('line')
            .attr('x1', 0)
            .attr('y1', yScale(0.0000001))
            .attr('x2', width)
            .attr('y2', yScale(0.0000001))
            .style('stroke', 'grey')
            .style('stroke-dasharray', ('3, 3'))
            .style('stroke-width', 0.5)
          //add labels
          chart.append('text')
            .text('-log10 p-value')
            .attr('x', 20)
            .attr('y', height / 1.8)
            .attr('transform', 'translate(-150,150) rotate(-90)')
            .attr('class', 'axisLabel')
            .style('font-size', '0.4em')
            .style('font-family', 'sans-serif')
          chart.append('text')
            .attr('x', width / 2)
            .attr('y', height * 1.08)
            .attr('class', 'axisLabel')
            .style('text-anchor', 'middle')
            .text('beta value')
            .style('font-size', '0.4em')
            .style('font-family', 'sans-serif')
          //set up the tooltip
          var tip = d3.tip().attr('class', 'd3-tip').offset([-5, 0]).html((event, d) => {
            return d.category + '<br>' + '<br>' + d.phenostring + '<br>' + '<br>' + 'p-value: ' + d.pval + '<br>' + 'beta value: ' + d.beta + '<br>' + 'cases / controls: ' + d.n_case + ' / ' + d.n_control + '<br>' + 'pip: ' + d.pip
          })
          svg.call(tip)

///////////////////--bigger background dots--//////////////////////

          var g = svg.append('g').attr('id', 'dataPoints') //make a new g element to which we append circles
            .selectAll('g').data(data).enter().append('g')
          g.append('circle').attr('cx', function (d) {
            return xScale(d.beta) + 40
          }) //added offset to align beta values
            .attr('cy', function (d) {
              return yScale(d.pval)
            })
            .attr('r', d => sqrtScale(d.n_case))
            .style('pointer-events', 'none') //disable hover effects
            .style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.1
              } else {
                return 'opacity', 0.2
              }
            }).attr('fill', d => colorScale(colorValue(d))) //color by category

///////////////////////////--add dots--////////////////////////////

          g.append('circle').attr('cx', function (d) {
            return xScale(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale(d.pval)
          }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'circleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.4
            } else {
              return 'opacity', 1
            }
          }).attr('fill', d => colorScale(colorValue(d)))


            ////////////////////--hover events--////////////////////////////////

            //tooltip
            .on('mouseover.tip', tip.show, function () {
              d3.select(this).transition().duration('100')
            }).on('mouseout.tip', tip.hide)
            //highlight color
            .on('mouseover.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
            }).on('mouseout.color', function () {
            d3.select(this).transition().duration('200').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            }).attr('r', 2)
          })
            //add labels on click, mostly credit to Nicola
            .on('click', function (e, d) {
              var x = parseFloat(d3.select(this).attr('cx')),
                y = parseFloat(d3.select(this).attr('cy'))
              //format the case number with a comma separator
              let format = d3.format(',')
              let formattedCases = format(d.n_case)
              const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
              label.append('line')
                .attr('x1', 0)
                .attr('y1', -2.5)
                .attr('x2', -10)
                .attr('y2', -10)
                .style('stroke-width', '0.5px')
                .style('stroke', '#d3d3d3')
              label.append('text')
                .style('font-size', '5px')
                .style('font-family', 'sans-serif')
                .style('cursor', 'grab')
                .text(d.phenostring)
                .call(d3.drag().on('start', dragLabelStarted))
              //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
                //tspan in a separate line
                .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
            })
            //reset labels on double-click
            .on('dblclick', function () {
              labelLayer.selectAll('*').remove()
            })

////////////////////--legends--///////////////////////////////////////

          newData = data.filter(d => d.pval <= 0.0000001)
          //categoryData = data.filter(d => d.category == 'Diseases marked as autimmune origin')
          //https://wsvincent.com/javascript-remove-duplicates-array/, this method found from the chat belove the post
          const unique = []
          newData.map(x => unique.filter(a => a.category == x.category && a.category == x.category).length > 0 ? null : unique.push(x))
          //Initialize data
          var chartData = unique
          //Initialize legend
          var clicked = ''
          var legendItemSize = 8
          var legendSpacing = 20
          var xOffset = 10
          var yOffset = 10
          //var labelsBlock = d3.select('#labels-block')
          var gLeg = legendBlockVar2.selectAll('g').data(chartData).enter().append('g')
          gLeg.append('circle').style('fill', d => colorScale(colorValue(d))).attr('r', legendItemSize).attr('transform', (d, i) => {
            var x = xOffset
            var y = yOffset + (legendItemSize + legendSpacing) * i
            return `translate(${x}, ${y})`
          })
          gLeg.append('text').attr('class', 'label').attr('x', xOffset + legendItemSize + 5).attr('y', (d, i) => yOffset + (legendItemSize + legendSpacing) * i + 5).text(d => d.category)

          gLeg.on('mouseover.legend', function (d) {
            d3.selectAll('.newCircleCenter').remove()
            var legendText = this.textContent //get the text of the legend in a variable
            var HighlightData = data.filter(d => d.category == legendText) //get the data objects associated with the legend
            d3.selectAll('.circleCenter').style('opacity', 0.1) //on any click set all centers to hidemode
            //.style('pointer-events', 'none')
            //Append new circles
            var g = svg.append('g').selectAll('g').data(HighlightData).enter().append('g')
            g.append('circle').attr('cx', function (d) {
              return xScale(d.beta) + 40
            }).attr('cy', function (d) {
              return yScale(d.pval)
            }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'newCircleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', 1).attr('fill', d => colorScale(colorValue(d)))
              //tooltip
              .on('mouseover.tip', tip.show, function () {
                d3.select(this).transition().duration('100')
              }).on('mouseout.tip', tip.hide)
              //highlight color
              .on('mouseover.color', function () {
                d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
              }).on('mouseout.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', 2)
            })
              //add labels on click, mostly credit to Nicola
              .on('click', function (e, d) {
                var x = parseFloat(d3.select(this).attr('cx')),
                  y = parseFloat(d3.select(this).attr('cy'))
                //format the case number with a comma separator
                let format = d3.format(',')
                let formattedCases = format(d.n_case)
                const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
                label.append('line')
                  .attr('x1', 0)
                  .attr('y1', -2.5)
                  .attr('x2', -10)
                  .attr('y2', -10)
                  .style('stroke-width', '0.5px')
                  .style('stroke', '#d3d3d3')
                label.append('text')
                  .style('font-size', '5px')
                  .style('font-family', 'sans-serif')
                  .style('cursor', 'grab')
                  .text(d.phenostring).call(d3.drag().on('start', dragLabelStarted))
                //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
                label.append('text')
                  .style('font-size', '5px')
                  .style('font-family', 'sans-serif')
                  .text('')
                  .call(d3.drag().on('start', dragLabelStarted))
                  //tspan in a separate line
                  .append('tspan')
                  .style('cursor', 'grab')
                  .style('font-size', '5px')
                  .style('font-family', 'sans-serif')
                  .attr('dy', '7px')
                  .attr('dx', '0px')
                  .text('Cases: ' + formattedCases)
                  .call(d3.drag().on('start', dragLabelStarted))
              })
              //reset labels on double-click
              .on('dblclick', function () {
                labelLayer.selectAll('*').remove()
              })
            //highlight selected gLeg group
            d3.selectAll(gLeg).style('opacity', 0.5)
            d3.select(this).style('opacity', 1)
          }) //end of click
          //double-click anywhere on the labels block
          var labelsBlock = d3.select('#labels-block')
          labelsBlock.on('mouseout.legend', function (d) {
            //reset circlecenter opacity
            d3.selectAll('.circleCenter').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            })
            //remove highlights
            d3.selectAll('.newCircleCenter').remove()
            //legend items back to full opacity
            d3.selectAll(gLeg).style('opacity', 1)
          })

//////////////////////--brushing--/////////////////////////

          //help from https://peterbeshai.com/blog/2016-12-03-brushing-in-scatterplots-with-d3-and-quadtrees/
          //const selection2 = [];//an empty array where we can push data
          const brush = d3.brush().extent([
            [0, 0],
            [width, height]
          ]) //stay within the chart and above the significance
          //attach the brush to the chart
          const gBrush = chart.append('g').attr('class', 'brush').call(brush)
          //column setup for the brushed data
          const table = d3.select('#info-column')
          const categoryCol = d3.select('#category')
          const phenoCol = d3.select('#phenotype')
          const pvalCol = d3.select('#pval')
          const betaCol = d3.select('#beta')
          const caseCol = d3.select('#case-control')
          //brush event inside the overview state
          brush.on('end', function (event, d) {
            const selection = event.selection //the scope of the brush
            d3.selectAll('circle').each(function (d) { //go through the points
              //condition: stay within the brush rect
              if (selection && yScale(d.pval) > selection[0][1] && yScale(d.pval) < selection[1][1] && xScale(d.beta) > selection[0][0] && xScale(d.beta) < selection[1][0]) {
                selection2.push(d) //push data to the empty array
              }
            })

            //function to remove duplicate values from the array
            function removeDuplicates (selection2) {
              return selection2.filter((value, index) => selection2.indexOf(value) === index)
            }

            //console.log(removeDuplicates(selection2))
            categoryCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).attr('margin-top', function (d, i) {
              if ('overflow-x' == true) {
                return -3
              }
            }).html(function (d) {
              return d.category
            })
            phenoCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').attr('id', 'row').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.phenostring
            })
            pvalCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.pval
            })
            betaCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.beta
            })
            caseCol.selectAll('p').data((removeDuplicates(selection2))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.n_case + ' / ' + d.n_control
            })
          })

          //hide the convex hull
          function hideHull () {
            svg.selectAll('.hullPath').remove()
            //still need to remove the checkmark from the box on toggle
          }

          function removeText () { //remove texts tagged with 'info' class
            d3.selectAll('p.info').remove()
          }

///////////////////--highlight pip--//////////////////////

          var subset = data.filter(d => d.pip >= 0.1) //pip values bigger or equal to 0.1
          var subset2 = data.filter(d => d.pip > 0 && d.pip < 0.1) //pip values bigger than zero but smaller than 0.1
          //console.log(subset2)//subset 2 doesn't have anything for this dataset apparently
          function showPip () {
            svg.selectAll('.dot').data(subset).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
              return xScale(d.beta) + 40
            }).attr('cy', function (d) {
              return yScale(d.pval)
            }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('opacity', 1).style('pointer-events', 'none')
          }

          function showSmallPip () {
            svg.selectAll('.dot').data(subset2).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
              return xScale(d.beta) + 40
            }).attr('cy', function (d) {
              return yScale(d.pval)
            }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('opacity', 1).style('pointer-events', 'none')
          }

          //for significant ones
          function showPip2 () {
            svg.selectAll('.dot').data(subset).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
              return xScale2(d.beta) + 40
            }).attr('cy', function (d) {
              if (d.pval <= 0.0000001) {
                return yScale3(d.pval)
              }
            }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('opacity', 1).style('pointer-events', 'none')
          }

          function showSmallPip2 () {
            svg.selectAll('.dot').data(subset2).enter().append('circle').attr('r', 2).attr('class', 'pipdot').attr('cx', function (d) {
              return xScale2(d.beta) + 40
            }).attr('cy', function (d) {
              if (d.pval <= 0.0000001) {
                return yScale3(d.pval)
              }
            }).style('fill', d => colorScale(colorValue(d))).style('stroke', 'black').style('opacity', 1).style('pointer-events', 'none')
          }

          function hidePip () {
            d3.selectAll('circle.pipdot').remove()
          }

          labelLayer.raise()

          /////////////////////--csv download--///////////////////////////
          function downloadCsv () {
            //function to remove duplicate values from the array
            function removeDuplicates (selection2) {
              return selection2.filter((value, index) => selection2.indexOf(value) === index)
            }

            //make the header
            var data_export_csv_header = Object.keys(selection2[0]).join(), //gets data keys as strings
              rows = removeDuplicates(selection2)
            //this is the core
            var data_export_csv_rows = rows.map(function (el) {
              return Object.values(el).join()
            }).join('\n')
            var data_export_csv = data_export_csv_header + '\n' + data_export_csv_rows //join header and rows
            /*https://riptutorial.com/javascript/example/24711/client-side-csv-download-using-blob*/
            var blob = new Blob([data_export_csv])
            if (window.navigator.msSaveOrOpenBlob) {
              window.navigator.msSaveBlob(blob, 'tableData.csv')
            } else {
              var a = window.document.createElement('a') //empty element(link)
              a.href = window.URL.createObjectURL(blob, {
                type: 'text/plain'
              })
              //console.log(a.href, 'ciao');
              a.download = 'tableData.csv'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }
          }

          document.getElementById('button_styled_download').onclick = function () {
            return downloadCsv()
          }
        } //end of overview

/////////////////////////////////////////////////////////////////////////
//////////////////--show significant ones function--////////////////////
/////////////////////////////////////////////////////////////////////////

        function redrawScale () { //despite the name redraw both the scales and the dots based on pval being smaller than 0.0000001
          newData = data.filter(d => d.pval <= 0.0000001)
          removeText()
          resetDiv()
          //interactiveLabels();
          //remove old stuff
          svg.selectAll('.hullPath').remove()
          d3.selectAll('circle').remove()
          d3.selectAll('g.tick').remove()
          d3.selectAll('path.domain') //remove double scale lines
            .remove()
          d3.selectAll('line').remove()
          d3.selectAll('.annotation-label').remove()
          d3.selectAll('.annotation-rect').remove()
          /*d3.selectAll('.legendContainer')
            .remove();*/
          d3.select('#gLegContainer').remove()
          d3.select('rect').remove()
          d3.select('#gLegContainer2').remove()
          d3.select('g.brush').remove() //remove old brush while changing the view
          //clear label layer
          labelLayer.selectAll('*').remove()
          //Append the new X Axis
          chart.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale2).ticks(5).tickSize(-height))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5)
          //Append the new Y Axis
          chart.append('g').attr('transform', `translate(0, 0)`).call(d3.axisLeft(yScale3).ticks(3).tickSize(-width))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5).text(function (d) {
            return d === 1 ? d : d.toExponential().replace('1e-', '')
          })
          //style the tick lines
          d3.selectAll('g.tick').select('line').style('stroke-width', 0.1).style('opacity', 0.5)
          //lightly color the zero side of the x-axis
          chart.append('rect')
            .attr('height', height)
            .attr('width', xScale2(0))
            .attr('fill', 'lightgray')
            .attr('opacity', 0.2)

          //Append new circles
          var g = svg.append('g').selectAll('g').data(newData).enter().append('g')
          g.append('circle').attr('cx', function (d) {
            return xScale2(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale3(d.pval)
          }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'circleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', 1).attr('fill', d => colorScale(colorValue(d)))
            //tooltip
            .on('mouseover.tip', tip.show, function () {
              d3.select(this).transition().duration('100')
            }).on('mouseout.tip', tip.hide)
            //highlight color
            .on('mouseover.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
            }).on('mouseout.color', function () {
            d3.select(this).transition().duration('200').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            }).attr('r', 2)
          })
            //add labels on click, mostly credit to Nicola
            .on('click', function (e, d) {
              var x = parseFloat(d3.select(this).attr('cx')),
                y = parseFloat(d3.select(this).attr('cy'))
              //format the case number with a comma separator
              let format = d3.format(',')
              let formattedCases = format(d.n_case)
              const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
              label.append('line').attr('x1', 0).attr('y1', -2.5).attr('x2', -10).attr('y2', -10).style('stroke-width', '0.5px').style('stroke', '#d3d3d3')
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').style('cursor', 'grab').text(d.phenostring).call(d3.drag().on('start', dragLabelStarted))
              //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
                //tspan in a separate line
                .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
            })
            //reset labels on double-click
            .on('dblclick', function () {
              labelLayer.selectAll('*').remove()
            })
          //bigger circles
          g.append('circle').attr('id', 'dataPoints').attr('cx', function (d) {
            return xScale2(d.beta) + 40
          }) //added offset to align beta values
            .attr('cy', function (d) {
              return yScale3(d.pval)
            }).attr('r', d => sqrtScale(d.n_case)).style('pointer-events', 'none') //disable hover effects
            .attr('class', 'circleBackground').style('opacity', 0.2).attr('fill', d => colorScale(colorValue(d))) //color by category
          //brushing significant ones, help from https://peterbeshai.com/blog/2016-12-03-brushing-in-scatterplots-with-d3-and-quadtrees/
          const brush = d3.brush().extent([
            [0, 0],
            [width, height]
          ]) //stay within the chart and above the significance
          const gBrush = chart.append('g').attr('class', 'brush').call(brush)
          //column setup for the brushed data
          const table = d3.select('#info-column')
          const categoryCol = d3.select('#category')
          const phenoCol = d3.select('#phenotype')
          const pvalCol = d3.select('#pval')
          const betaCol = d3.select('#beta')
          const caseCol = d3.select('#case-control')

//////////////////--legends--//////////////////////////////////////////
          //significant ones label block
          //https://wsvincent.com/javascript-remove-duplicates-array/, this method found from the chat belove the post
          const unique = []
          newData.map(x => unique.filter(a => a.category == x.category && a.category == x.category).length > 0 ? null : unique.push(x))
          //console.log(unique);
          //Initialize data
          var chartData = unique
          //Initialize legend
          var legendItemSize = 8
          var legendSpacing = 20
          var xOffset = 10
          var yOffset = 10
          //create an svg for legend container since it's outside of the chart div
          const svg5 = d3.select('#labels-block').append('svg').attr('id', 'gLegContainer')
          //.attr("width", 500).attr("height", height * 2.1); //width and height of the inner svg, doesn't affect the div
          const legendBlockVar4 = svg5.append('g') //another one for zooming()
          var gLeg = legendBlockVar4.selectAll('g').data(chartData).enter().append('g')
          gLeg.append('circle').style('fill', d => colorScale(colorValue(d))).attr('r', legendItemSize).attr('transform', (d, i) => {
            var x = xOffset
            var y = yOffset + (legendItemSize + legendSpacing) * i
            return `translate(${x}, ${y})`
          })
          gLeg.append('text').attr('class', 'label').attr('x', xOffset + legendItemSize + 5).attr('y', (d, i) => yOffset + (legendItemSize + legendSpacing) * i + 5).text(d => d.category)
          gLeg.on('mouseover.legend', function (d) {
            d3.selectAll('.newCircleCenter').remove()
            var legendText = this.textContent //get the text of the legend in a variable
            var HighlightData = newData.filter(d => d.category == legendText) //get the data objects associated with the legend
            d3.selectAll('.circleCenter').style('opacity', 0.1) //on any click set all centers to hidemode
            //.style('pointer-events', 'none')
            //Append new circles
            var g = svg.append('g').selectAll('g').data(HighlightData).enter().append('g')
            g.append('circle').attr('cx', function (d) {
              return xScale2(d.beta) + 40
            }).attr('cy', function (d) {
              return yScale3(d.pval)
            }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'newCircleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', 1).attr('fill', d => colorScale(colorValue(d)))
              //tooltip
              .on('mouseover.tip', tip.show, function () {
                d3.select(this).transition().duration('100')
              }).on('mouseout.tip', tip.hide)
              //highlight color
              .on('mouseover.color', function () {
                d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
              }).on('mouseout.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', 2)
            })
              //add labels on click, mostly credit to Nicola
              .on('click', function (e, d) {
                var x = parseFloat(d3.select(this).attr('cx')),
                  y = parseFloat(d3.select(this).attr('cy'))
                //format the case number with a comma separator
                let format = d3.format(',')
                let formattedCases = format(d.n_case)
                const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
                label.append('line').attr('x1', 0).attr('y1', -2.5).attr('x2', -10).attr('y2', -10).style('stroke-width', '0.5px').style('stroke', '#d3d3d3')
                label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').style('cursor', 'grab').text(d.phenostring).call(d3.drag().on('start', dragLabelStarted))
                //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
                label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
                  //tspan in a separate line
                  .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
              })
              //reset labels on double-click
              .on('dblclick', function () {
                labelLayer.selectAll('*').remove()
              })
            //highlight selected gLeg group
            d3.selectAll(gLeg).style('opacity', 0.5)
            d3.select(this).style('opacity', 1)
          }) //end of click
          //double-click anywhere on the labels block
          var labelsBlock = d3.select('#labels-block')
          labelsBlock.on('mouseout.legend', function (d) {
            //reset circlecenter opacity
            d3.selectAll('.circleCenter').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            })
            //remove highlights
            d3.selectAll('.newCircleCenter').remove()
            //legend items back to full opacity
            d3.selectAll(gLeg).style('opacity', 1)
          })

////////////////////////////////////////////////////////////////////
          //brush event
          brush.on('end', function (event, d) {
            const selection = event.selection //the scope of the brush
            d3.selectAll('circle').each(function (d) { //go through the points
              //condition: stay within the brush rect
              if (selection && yScale3(d.pval) > selection[0][1] && yScale3(d.pval) < selection[1][1] && xScale2(d.beta) > selection[0][0] && xScale2(d.beta) < selection[1][0]) {
                selection3.push(d) //push data to the empty array
              }
            })

            //function to remove duplicate values from the array
            function removeDuplicates2 (selection2) {
              return selection3.filter((value, index) => selection3.indexOf(value) === index)
            }

            categoryCol.selectAll('p').data((removeDuplicates2(selection3))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).attr('margin-top', function (d, i) {
              if ('overflow-x' == true) {
                return -3
              }
            }).html(function (d) {
              return d.category
            })
            phenoCol.selectAll('p').data((removeDuplicates2(selection3))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').attr('id', 'row').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.phenostring
            })
            pvalCol.selectAll('p').data((removeDuplicates2(selection3))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.pval
            })
            betaCol.selectAll('p').data((removeDuplicates2(selection3))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.beta
            })
            caseCol.selectAll('p').data((removeDuplicates2(selection3))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.n_case + ' / ' + d.n_control
            })
          })

          function removeText () { //remove texts tagged with 'info' class
            d3.selectAll('p.info').remove()
          }

          labelLayer.raise()

          /////////////////////--csv download--///////////////////////////
          function downloadCsv () {
            //function to remove duplicate values from the array
            function removeDuplicates (selection3) {
              return selection3.filter((value, index) => selection3.indexOf(value) === index)
            }

            //make the header
            var data_export_csv_header = Object.keys(selection3[0]).join(), //gets data keys as strings
              rows = removeDuplicates(selection3)
            //this is the core
            var data_export_csv_rows = rows.map(function (el) {
              return Object.values(el).join()
            }).join('\n')
            var data_export_csv = data_export_csv_header + '\n' + data_export_csv_rows //join header and rows
            /*https://riptutorial.com/javascript/example/24711/client-side-csv-download-using-blob*/
            var blob = new Blob([data_export_csv])
            if (window.navigator.msSaveOrOpenBlob) {
              window.navigator.msSaveBlob(blob, 'tableData.csv')
            } else {
              var a = window.document.createElement('a') //empty element(link)
              a.href = window.URL.createObjectURL(blob, {
                type: 'text/plain'
              })
              //console.log(a.href, 'ciao');
              a.download = 'tableData.csv'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }
          }

          document.getElementById('button_styled_download').onclick = function () {
            return downloadCsv()
          }

        } //end of redraw

/////////////////////////////////////////////////////
//////////////////--simple zoom----//////////////////
////////////////////////////////////////////////////

        function zooming () {

          showZoomClear()
          resetDiv()//reset the legend block
          //remove old stuff
          svg.selectAll('.hullPath') //remove hull if there is one
            .remove()
          svg.selectAll('rect').remove()
          d3.selectAll('circle') //remove old circles
            .remove()
          d3.selectAll('g.tick') //remove old ticks from old scales
            .remove()
          d3.selectAll('path.domain') //remove double scale lines
            .remove()
          d3.select('g.brush') //remove old brush square
            .remove()
          //remove annotations
          d3.selectAll('.annotation-label').remove()
          d3.selectAll('.annotation-rect').remove()
          d3.selectAll('.legendContainer') //remove old legends
            .remove()
          d3.selectAll('#gLegContainer').remove()
          d3.selectAll('#gLegContainer2').remove()
          d3.selectAll('#gLegContainer3').remove()
          d3.selectAll('line').remove()
          //clear label layer
          labelLayer.selectAll('*').remove()
          //create an svg for legend container since it's outside of the chart div
          const svg4 = d3.select('#labels-block').append('svg').attr('id', 'gLegContainer')
          //.attr("width", 500).attr("height", height * 2.1); //width and height of the inner svg, doesn't affect the div
          const legendBlockVar3 = svg4.append('g') //another one for zooming()
          //get min and max p values from selection for zooming
          var pMax2 = d3.max(selection2, function (d) {
            return d.pval
          })
          var pMin2 = d3.min(selection2, function (d) {
            return d.pval
          })
          var yScale4 = d3.scaleLog().domain([pMin2 - (pMin2 / 1.001), pMax2 + (pMax2 * 2)]).range([0, height]).nice()
          //get min and max beta from selection for zooming
          var betaMax3 = d3.max(selection2, function (d) {
            return d.beta
          })
          var betaMin3 = d3.min(selection2, function (d) {
            return d.beta
          })
          var xScale3 = d3.scaleLinear()
            //.domain([betaMin3-(betaMax3),betaMax3+(betaMin3*(-1))])
            .domain([betaMin3 - 0.1, betaMax3 + 0.1]).range([0, width])
          //Append the new X Axis
          chart.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale3).ticks(5, '.2f').tickSize(-height))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5)
          //Append the new Y Axis
          chart.append('g').attr('transform', `translate(0, 0)`).call(d3.axisLeft(yScale4).tickSize(-width).tickArguments([5, '.0f']))
            //adjust tick labels
            .selectAll('text').style('font-size', '0.5em').style('opacity', 0.5).text(function (d) {
            return d === 1 ? d : d.toExponential().replace('1e-', '')
          })
          //style the tick lines
          d3.selectAll('g.tick').select('line').style('stroke-width', 0.1).style('opacity', 0.5)
          //lightly color the zero side of the x-axis
          chart.append('rect')
            .attr('height', height)
            .attr('width', xScale3(0))
            .attr('fill', 'lightgray')
            .attr('opacity', 0.2)

          var g = svg.append('g') //make a new g element to which we append circles
            .selectAll('g').data(selection2).enter().append('g')
          g.append('circle').attr('cx', function (d) {
            return xScale3(d.beta) + 40
          }).attr('cy', function (d) {
            return yScale4(d.pval)
          }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'circleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.4
            } else {
              return 'opacity', 1
            }
          }).attr('fill', d => colorScale(colorValue(d)))
            //tooltip
            .on('mouseover.tip', tip.show, function () {
              d3.select(this).transition().duration('100')
            }).on('mouseout.tip', tip.hide)
            //highlight color
            .on('mouseover.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
            }).on('mouseout.color', function () {
            d3.select(this).transition().duration('200').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            }).attr('r', 2)
          })
            //add labels on click, mostly credit to Nicola
            .on('click', function (e, d) {
              var x = parseFloat(d3.select(this).attr('cx')),
                y = parseFloat(d3.select(this).attr('cy'))
              //format the case number with a comma separator
              let format = d3.format(',')
              let formattedCases = format(d.n_case)
              const label = labelLayer.append('g').classed('chartLabel', true).style('transform', `translate(${x + 10}px,${y + 10}px)`)
              label.append('line')
                .attr('x1', 0)
                .attr('y1', -2.5)
                .attr('x2', -10)
                .attr('y2', -10)
                .style('stroke-width', '0.5px')
                .style('stroke', '#d3d3d3')
              label.append('text')
                .style('font-size', '5px')
                .style('font-family', 'sans-serif')
                .style('cursor', 'grab')
                .text(d.phenostring)
                .call(d3.drag().on('start', dragLabelStarted))
              //I'm sure this can be worked in another way, but appended an empty string where to append the tspan: empty string allows us to always translate to the correct x-point without worrting anbout the lenght of the first string
              label.append('text').style('font-size', '5px').style('font-family', 'sans-serif').text('').call(d3.drag().on('start', dragLabelStarted))
                //tspan in a separate line
                .append('tspan').style('cursor', 'grab').style('font-size', '5px').style('font-family', 'sans-serif').attr('dy', '7px').attr('dx', '0px').text('Cases: ' + formattedCases).call(d3.drag().on('start', dragLabelStarted))
            })
            //reset labels on double-click
            .on('dblclick', function () {
              labelLayer.selectAll('*').remove()
            })
          //bigger background dots
          g.append('circle').attr('id', 'dataPoints').attr('cx', function (d) {
            return xScale3(d.beta) + 40
          }) //added offset to align beta values
            .attr('cy', function (d) {
              return yScale4(d.pval)
            }).attr('r', d => sqrtScale(d.n_case))
            .style('pointer-events', 'none') //disable hover effects
            .attr('class', 'circleBackground').style('opacity', function (d) {
            if (d.pval >= 0.0000001) {
              return 'opacity', 0.1
            } else {
              return 'opacity', 0.2
            }
          }).attr('fill', d => colorScale(colorValue(d))) //color by category
          g.append('line').attr('x1', 40).attr('y1', function (d) {
            if (d.pval > 0.0000001) {
              return yScale4(0.0000001)
            }
          }).attr('x2', width + 40).attr('y2', function (d) {
            if (d.pval > 0.0000001) {
              return yScale4(0.0000001)
            }
          }).style('stroke', 'grey').style('stroke-dasharray', ('3, 3')).style('stroke-width', 0.3)
          //help from https://peterbeshai.com/blog/2016-12-03-brushing-in-scatterplots-with-d3-and-quadtrees/
          const brush = d3.brush().extent([
            [0, 0],
            [width, height]
          ]) //stay within the chart
          //attach the brush to the chart
          const gBrush = chart.append('g').attr('class', 'brush').call(brush)
          ////////////////////////////////////////////////////////////
          //https://wsvincent.com/javascript-remove-duplicates-array/, this method found from the chat belove the post
          const unique = []
          selection2.map(x => unique.filter(a => a.category == x.category && a.category == x.category).length > 0 ? null : unique.push(x))
          //Initialize data
          var chartData = unique
          //Initialize legend
          var legendItemSize = 8
          var legendSpacing = 20
          var xOffset = 10
          var yOffset = 10
          var gLeg = legendBlockVar3.selectAll('g').data(chartData).enter().append('g')
          gLeg.append('circle').style('fill', d => colorScale(colorValue(d))).attr('r', legendItemSize).attr('transform', (d, i) => {
            var x = xOffset
            var y = yOffset + (legendItemSize + legendSpacing) * i
            return `translate(${x}, ${y})`
          })
          gLeg.append('text').attr('class', 'label').attr('x', xOffset + legendItemSize + 5).attr('y', (d, i) => yOffset + (legendItemSize + legendSpacing) * i + 5).text(d => d.category)
          ////////////////////////////////////////////////////////////////////
          //attaching click to the legend text for now
          gLeg.on('mouseover.legend', function (d) {
            d3.selectAll('.newCircleCenter').remove()
            var legendText = this.textContent //get the text of the legend in a variable
            var HighlightData = selection2.filter(d => d.category == legendText) //get the data objects associated with the legend
            d3.selectAll('.circleCenter').style('opacity', 0.1) //on any click set all centers to hidemode
            //.style('pointer-events', 'none')
            //Append new circles
            var g = svg.append('g').selectAll('g').data(HighlightData).enter().append('g')
            g.append('circle').attr('cx', function (d) {
              return xScale3(d.beta) + 40
            }).attr('cy', function (d) {
              return yScale4(d.pval)
            }).attr('fill', d => colorScale(colorValue(d))).attr('class', 'newCircleCenter').attr('r', 2).attr('stroke', 'white').attr('opacity', 1).attr('fill', d => colorScale(colorValue(d)))
              //tooltip
              .on('mouseover.tip', tip.show, function () {
                d3.select(this).transition().duration('100')
              }).on('mouseout.tip', tip.hide)
              //highlight color
              .on('mouseover.color', function () {
                d3.select(this).transition().duration('200').style('opacity', 1).attr('r', d => sqrtScale(d.n_case))
              }).on('mouseout.color', function () {
              d3.select(this).transition().duration('200').style('opacity', 1).attr('r', 2)
            })
            //highlight selected gLeg group
            d3.selectAll(gLeg).style('opacity', 0.5)
            d3.select(this).style('opacity', 1)
          }) //end of click
          //double-click anywhere on the labels block
          var labelsBlock = d3.select('#labels-block')
          labelsBlock.on('mouseout.legend', function (d) {
            //reset circlecenter opacity
            d3.selectAll('.circleCenter').style('opacity', function (d) {
              if (d.pval >= 0.0000001) {
                return 'opacity', 0.4
              } else {
                return 'opacity', 1
              }
            })
            //remove highlights
            d3.selectAll('.newCircleCenter').remove()
            //legend items back to full opacity
            d3.selectAll(gLeg).style('opacity', 1)
          })
          //column setup for the brushed data
          const categoryCol = d3.select('#category')
          const phenoCol = d3.select('#phenotype')
          const pvalCol = d3.select('#pval')
          const betaCol = d3.select('#beta')
          const caseCol = d3.select('#case-control')
          //brush event
          brush.on('end', function (event, d) {
            const selection = event.selection //the scope of the brush
            d3.selectAll('circle').each(function (d) { //go through the points
              if (selection && yScale4(d.pval) > selection[0][1] && yScale4(d.pval) < selection[1][1] && xScale3(d.beta) > selection[0][0] && xScale3(d.beta) < selection[1][0]) {
                selection4.push(d) //push data to the empty array
              }
            })

            //function to remove duplicate values from the array
            function removeDuplicates3 (selection4) {
              return selection4.filter((value, index) => selection4.indexOf(value) === index)
            }

            //console.log(removeDuplicates3(selection4));
            /*new values to table from selection 4*/
            categoryCol.selectAll('p').data((removeDuplicates3(selection4))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).attr('margin-top', function (d, i) {
              if ('overflow-x' == true) {
                return -3
              }
            }).html(function (d) {
              return d.category
            })
            phenoCol.selectAll('p').data((removeDuplicates3(selection4))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').attr('id', 'row').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.phenostring
            })
            pvalCol.selectAll('p').data((removeDuplicates3(selection4))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.pval
            })
            betaCol.selectAll('p').data((removeDuplicates3(selection4))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.beta
            })
            caseCol.selectAll('p').data((removeDuplicates3(selection4))).enter().append('div').attr('data-simplebar', 'init').style('overflow-x', 'auto').append('p').attr('class', 'info').attr('x', 10).attr('y', function (d, i) {
              return i * 12
            }).html(function (d) {
              return d.n_case + ' / ' + d.n_control
            })
          })
          labelLayer.raise()

          function downloadCsvZoom () {
            //function to remove duplicate values from the array
            function removeDuplicates3 (selection4) {
              return selection4.filter((value, index) => selection4.indexOf(value) === index)
            }

            //make the header
            var data_export_csv_header = Object.keys(selection4[0]).join(), //gets data keys as strings
              rows = removeDuplicates3(selection4)
            //this is the core
            var data_export_csv_rows = rows.map(function (el) {
              return Object.values(el).join()
            }).join('\n')
            var data_export_csv = data_export_csv_header + '\n' + data_export_csv_rows //join header and rows
            /*https://riptutorial.com/javascript/example/24711/client-side-csv-download-using-blob*/
            var blob = new Blob([data_export_csv])
            if (window.navigator.msSaveOrOpenBlob) {
              window.navigator.msSaveBlob(blob, 'tableData.csv')
            } else {
              var a = window.document.createElement('a') //empty element(link)
              a.href = window.URL.createObjectURL(blob, {
                type: 'text/plain'
              })
              //console.log(a.href, 'ciao');
              a.download = 'tableData.csv'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }
          }

          document.getElementById('button_styled_download_zoom').onclick = function () {
            return downloadCsvZoom()
          }
          console.log(selection4)
        } //end of zoom

        //hide the convex hull
        function hideHull () {
          svg.selectAll('.hullPath').remove()
        }

        function removeBrush2 () { //remove brush selection
          selection3.length = 0
        }

        function removeBrush3 () { //remove brush selection
          selection4.length = 0
        }

        const labelLayer = svg.append('g').attr('id', 'labelLayer')

        function dragLabelStarted (event) {
          const label = d3.select(this.parentNode)
          event.on('drag', dragged).on('end', ended)

          function dragged (event) {
            label.select('line').raise().attr('x1', event.x).attr('y1', event.y - 2.5)
            label.select('text').raise().attr('x', event.x).attr('y', event.y).style('cursor', 'grabbing')
          }

          function ended () {
            label.select('text').style('cursor', 'grab')
          }
        } //end of label drag

        //const [ciao,setCiao] = useState ('ciao!')

      } //end bracket for lavaa function
      volcano(props)
    }
  })

  function downloadImgClick () {
    myToggle()
    downloadImg()
  }

//hide download option buttons
  function hideDownloadOptions () {
    var show = document.getElementById('download-options')
    show.style.display = 'none'
  }

//toggle download button
  function myToggle () {
    var x = document.getElementById('download-options')
    if (x.style.display === 'none') {
      x.style.display = 'block'
    } else {
      x.style.display = 'none'
    }
  }

/////////////////////--image download by Nicola--////////////////
  function downloadImg () {
    //show options
    //d3.select("#download-options").style("display","block")
    /* PREPARE SVG DOWNLOAD BUTTON */
    //get svg element.
    var svg = d3.select('#chart').select('svg').node()
    var headline = d3.select('#headline-block').select('text').node()
    //console.log(headline)
    //get svg source.
    var serializer = new XMLSerializer()
    var source = serializer.serializeToString(svg)
    //add name spaces.
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
    }
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source
    //convert svg source to URI data scheme.
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
    //set url value to a element's href attribute.
    document.getElementById('downloadSvg').href = url
    //you can download svg file by right click menu.
    let svgWithBg = d3.select('#chart').select('svg').style('background-color', 'white').node()
    var svgString = new XMLSerializer().serializeToString(svgWithBg)
    // var DOMURL = window.location.pathname; // invalid request
    var img = new Image()
    var svgAbs = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8'
    })
    var url = URL.createObjectURL(svgAbs)
    img.onload = function () {
      let canvas = document.createElement('canvas')
      canvas.height = 750
      canvas.width = 799.5
      var ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 799.5, 800)
      // var jpg = canvas.toDataURL("image/jpeg",1.0);
      // DOMURL.revokeObjectURL(jpg);
      var image = canvas.toDataURL('image/jpeg', 1.0)
      document.getElementById('downloadJpeg').href = image
    }
    img.src = url
  }

  const selection2 = [] //an empty array where we can push brushed data
  const selection3 = [] //an empty array where we can push brushed data
  const selection4 = [] //an empty array where we can push brushed data

  function removeText () { //remove texts tagged with 'info' class
    d3.selectAll('p.info').remove()
  }

  function removeBrush () { //remove brush selection
    selection.length = 0
  }

  function removeBrush2 () { //remove brush selection
    selection3.length = 0
  }

  function removeBrush3 () { //remove brush selection
    selection4.length = 0
  }

  /*this doesn't work because selection is empty here, but if I call a function in the onClick that is inside the main function and has values in the array, the function itself returns not defined*/
  function tableClick () {
    removeText()
    removeBrush()
    removeBrush2()
    removeBrush3()
  }

  /*const [selection, setDataSelection] = useState([])
  function readData(){
    //format d3 data reader for tab separated files, then use setDataRaw
    d3.dsv("\t", data).then(selection=>{
      //defining new selection
      selection = newSelection
      setDataSelection(newSelection);
    })
    console.log(newSelection);
  }*/

  return (
    <>

      {/*This structure was for the start screen*/}
      {/*<div id="start">
  <div id="input-btn-block-start">
      <input id="data-file-start" type="file" className="custom-file-input-start"/>
  </div>
</div>

  <div id="afterStart">*/}

      <div style={{
        position: 'relative'
      }}>
        <div id="btn-block">
          <div id="btn-block-toggle">
            <button id="button_styled" onClick={() => tableClick()}>Clear selection</button>
            <a href="/#">
              <button className="button_styled" id="button_styled_download">Download table</button>
            </a>
          </div>
          <div id="btn-block-2">
            <button id="button_styled-2" onClick={() => tableClick()}>Clear selection</button>
            <a href="/#">
              <button className="button_styled" id="button_styled_download_zoom">Download table</button>
            </a>
          </div>

          <div id="info-column-wrapper">
            <div id="info-column">
              <div id="category">
                <h5 className="h5" style={{ width: '10vw' }}>Category</h5>
              </div>
              <div id="phenotype">
                <h5 className="h5" style={{ width: '10vw' }}>Phenotype</h5>
              </div>
              <div id="pval">
                <h5 className="h5" style={{ maxWidth: '10vw' }}>P-value</h5>
              </div>
              <div id="beta">
                <h5 className="h5" style={{ maxWidth: '10vw' }}>Beta</h5>
              </div>
              <div id="case-control">
                <h5 className="h5" style={{ maxWidth: '10vw' }}>Cases/Controls</h5>
              </div>
            </div>


            <div id="labels-block">
              <div id="divider-vertical"></div>
              <div id="labels-block-2">
                <button id="button_legend">Show legend &rarr;</button>
                <button className="button_collapse" id="buttonCollapse">&larr; Collapse</button>
              </div>
            </div>
          </div>

        </div>
      </div>


      <div id="chart">
        <div id="headline-block">
          <div id="chart-btn-block">
            <div className="chart-btn-container">
              <div className="flexbox-checkbox">

                <div id="hideThese">
                  <div id="input-btn-block"></div>
                </div>

                <button id="button_back">Go back</button>

                <div id="ZoomHull">
                  <label className="h5">Convex hulls
                    <input type="checkbox" id="hullCheckboxZoom" />
                    <span className="checkmark-custom"></span>
                  </label>
                </div>

                <div id="hullCheckboxDiv" style={{ marginTop: '1%' }}>
                  <label className="h5" style={{ paddingLeft: '1vw' }}>Convex hulls
                    <input type="checkbox" id="hullCheckbox" />
                    <span className="checkmark-custom" id="hullCheckMark"></span>
                  </label>
                </div>

                <div id="significanceCheckboxDiv" style={{ marginTop: '1%' }}>
                  <label className="h5" style={{ paddingLeft: '4vw' }}>Show significant
                    <input type="checkbox" id="significanceCheckbox" />
                    <span className="checkmark-custom-2"></span>
                  </label>
                </div>

                <div id="pipCheckboxDiv" style={{ marginTop: '1%' }}>
                  <label className="h5" style={{ paddingLeft: '4vw' }}>Show PIP &gt; 0
                    <input type="checkbox" id="pipCheckbox" />
                    <span className="checkmark-custom-3"></span>
                  </label>
                </div>

              </div>
            </div>
          </div>

          <div id="downloadImg-block">
            <button id="download" class="button_styled" onClick={() => {downloadImgClick()}}>download image</button>
            <div className="reportIssue">
              <div className="reportIcon">?</div>
              <a id="report"
                 href="mailto:stella.keppo@aalto.fi?subject=Issue report from LAVAA" className="h5"
                 style={{ paddingLeft: '0.5vw' }}>Report issue</a>
            </div>
          </div>

          <div id="chartInner">
          </div>
        </div>
      </div>

      {/* mwm1 : https://stackoverflow.com/questions/52801051/react-site-warning-the-href-attribute-requires-a-valid-address-provide-a-valid */}
      <div id="download-options">
        <div id="download-options-inner">
          <a href="/#" id="downloadSvg" download="LAVAA_volcano.svg">
            <button className="downloadImgBtn" onClick={() => hideDownloadOptions()}>svg</button>
          </a>
          <a href="/#" id="downloadJpeg" download="LAVAA_volcano">
            <button className="downloadImgBtn" onClick={() => hideDownloadOptions()}>jpeg</button>
          </a>
          <button className="close" id="closeBtn" onClick={() => hideDownloadOptions()}>
            <i className="ico-times" role="img" aria-label="Cancel"></i>
          </button>
        </div>
      </div>

      <div id="upload-options-background">
        <div id="upload-options"></div>
      </div>

      {/*</div>*/}
      {/*after start screen wrap div end*/}

    </>

  )

}

export default Lavaa
'use strict';

function populate_table(phenotypes) {
    $(function() {

        var table = new Tabulator('#table', {
            data: phenotypes,
            pagination: 'local',
            paginationSize: 100,
            initialSort: [ { column: 'pval', dir: 'asc' } ],
            columns: [
                {title:'Category', field:'category', headerFilter:true},
                {title:'Phenotype', field:'phenocode', headerFilter:true, /* TODO: filter on phenostring */
                 //widthGrow: 5,
                 formatter:'link',
                 formatterParams: {
                     label: function(cell){
                         var d = cell.getData();
                         return d.phenocode + (d.phenostring ? ': ' + d.phenostring : '');
                     },
                     urlPrefix: window.model.urlprefix + '/pheno/',
                 }
                },
                {title:'Samples', field:'num_samples'},  /* TODO: {num_cases} + {num_controls}, toLocaleString */
                {title:'GCλ0.01', field:'gc_lambda_hundred'}, /* TODO: toFixed(2) */
                {title:'Loci<5e-8', field:'num_peaks'},
                {title:'Top Variant', field:'chrom',
                 formatter:'link',
                 formatterParams: {
                     label: function(cell){
                         var d = cell.getData();
                         return fmt('{0}:{1} {2} / {3}', d.chrom, d.pos.toLocaleString(), d.ref, d.alt) +
                             (d.rsids ? d.rsids.replace(/,/g, ', '): '');
                     },
                     /* TODO: url */
                 }
                },
                {title:'Top P-value', field:'pval'},  /* TODO: handle 0, toExponential(1) */
                {title:'Nearest Gene(s)', field:'nearest_genes', headerFilter:true},  /* TODO: link each */
            ],
            tooltipGenerationMode: 'hover', // generate tooltips just-in-time when the data is hovered
            tooltips: function(cell) {
                // this function attempts to check whether an ellipsis ('...') is hiding part of the data.
                // to do so, I compare element.clientWidth against element.scrollWidth;
                // when scrollWidth is bigger, that means we're hiding part of the data.
                // unfortunately, the ellipsis sometimes activates too early, meaning that even with clientWidth == scrollWidth some data is hidden by the ellipsis.
                // fortunately, these tooltips are just a convenience so I don't mind if they fail to show.
                // I don't know whether clientWidth or offsetWidth is better. clientWidth was more convenient in Chrome74.
                var e = cell.getElement();
                //return '' + e.offsetWidth + ' || ' + e.scrollWidth + ' || ' + e.clientWidth;
                if (e.clientWidth >= e.scrollWidth) {
                    return false; // all the text is shown, so there is no '...', so no tooltip is needed
                } else if (cell.getColumn().getField() === 'phenocode') {
                    return e.innerText;
                } else {
                    return cell.getValue();
                }
            }
        });


    });
}

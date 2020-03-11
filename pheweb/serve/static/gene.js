'use strict';

function populate_variant_streamtable(data) {

    // data = _.sortBy(data, _.property('pval'));
    //
    var template = _.template($('#streamtable-functional-variants-template').html());
    var view = function(v) {
        return template({v: v});
    };
    var callbacks = {
        pagination: function(summary){
            // bootstrap tooltips need to be recreated
            $('[data-toggle="tooltip"]').tooltip({
                html: true,
                animation: false,
                container: 'body',
                placement: 'top'
            })
        },
        after_sort: function() {
            // bootstrap tooltips need to be recreated
            $('[data-toggle="tooltip"]').tooltip({
                html: true,
                animation: false,
                container: 'body',
                placement: 'top'
            })
        }
    }
    var options = {
        view: view,
        search_box: false,
	callbacks: callbacks,
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
    	    container_class: 'functional-pagination',
    	    ul_class: 'functional-pagination',
            per_page_select: true,
            per_page_opts: [10000],
            per_page: 10000
        }
    }

    $("<style type='text/css'> .functional_variants>.st_search { display: None }</style>").appendTo("head");
    $("<style type='text/css'> .functional-pagination { display: None }</style>").appendTo("head");
    options.pagination.next_text = "";
    options.pagination.prev_text = "";
    $('#stream_table_functional_variants').stream_table(options, data);

    if (window.stream_table_sortingFunc) {
	$('#stream_table_functional_variants').data('st')._sortingFunc = window.stream_table_sortingFunc
    }

    $(function () {
        $('[data-toggle="tooltip"]').tooltip({
            html: true,
            animation: false,
            container: 'body',
            placement: 'top'
        })
    });
}

function populate_drugs_streamtable(data) {

    // data = _.sortBy(data, _.property('pval'));
    var template = _.template($('#streamtable-drugs-template').html());
    var view = function(d) {
        return template({d: d});
    };

    var options = {
        view: view,
        search_box: false,
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
    	    container_class: 'drugs-pagination',
    	    ul_class: 'drugs-pagination',
            per_page_select: true,
            per_page_opts: [10000],
            per_page: 10000
        }
    }

    $("<style type='text/css'> .drugs>.st_search { display: None }</style>").appendTo("head");
    $("<style type='text/css'> .drugs-pagination { display: None }</style>").appendTo("head");
    options.pagination.next_text = "";
    options.pagination.prev_text = "";

    $('#stream_table_drugs').stream_table(options, data);
    $('#drugs-container').css('display', 'block')
}

function populate_lof_streamtable(data) {

    var template = _.template($('#streamtable-lof-template').html());
    var view = function(r) {
        return template({r: r});
    };

    var options = {
        view: view,
        search_box: '#search-lof',
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
    	    container_class: 'lof-pagination',
    	    ul_class: 'lof-pagination',
            per_page_select: true,
            per_page_opts: [10],
            per_page: 10
        }
    }

    $('#stream_table_lof').stream_table(options, data);
    $('#lof-container').css('display', 'block')
}

function populate_streamtable(data) {

    var template = _.template($('#streamtable-template').html());
    var view = function(p) {
        return template({p: p});
    };
    var fields = function(item) {
	return [
	    item.pheno.phenocode,
	    item.pheno.phenostring,
	    item.pheno.category,
	    item.variant.rsids
	].join(' ')
    }
    var callbacks = {
        pagination: function(summary){
            // bootstrap tooltips need to be recreated
            $('[data-toggle="tooltip"]').tooltip({
                html: true,
                animation: false,
                container: 'body',
                placement: 'top'
            })
        },
        after_sort: function() {
            // bootstrap tooltips need to be recreated
            $('[data-toggle="tooltip"]').tooltip({
                html: true,
                animation: false,
                container: 'body',
                placement: 'top'
            })
        }
    }

    var options = {
        view: view,
        search_box: '#search',
	callbacks: callbacks,
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
	    container_class: 'pheno-pagination',
	    ul_class: 'pheno-pagination',
            per_page_select: true,
	    per_page_opts: [10],
            per_page: 10
        },
	fields: fields
    }
    $('#stream_table').stream_table(options, data);
    if (window.stream_table_sortingFunc) {
	$('#stream_table').data('st')._sortingFunc = window.stream_table_sortingFunc
    }

    $('[data-toggle="tooltip"]').tooltip({
        html: true,
        animation: false,
        container: 'body',
        placement: 'top'
    })
}

function variant_id_to_pheweb_format(variant) {
    var split = variant.split(/:/)
    return split[0].replace('chr', '') + '-' + split.slice(1).join('-')
}


$(function () {
    $("#export").click( function (event) {
    exportTableToCSV.apply(this, [$('#stream_table'),window.gene_symbol + "_top_associations.tsv",window.gene_pheno_export_fields])
  });
})

$(function () {
  $("#export_drugs").click( function (event) {
      exportTableToCSV.apply(this, [$('#stream_table_drugs'),window.gene_symbol + "_drugs.tsv",window.drug_export_fields])
  });
})

$(function () {
  $("#export_lof").click( function (event) {
      exportTableToCSV.apply(this, [$('#stream_table_lof'),window.gene_symbol + "_lof.tsv",window.lof_export_fields])
  });
})

$(function () {
  $("#export_func_vars").click( function (event) {
      // export so that variant vs. assoc gets repeated....
      //exportTableToCSV.apply(this, [$('#stream_table_functional_variants'),window.gene_symbol + "_functional_variants.tsv"])
      var sTableData = $('#stream_table_functional_variants').data('st').getData()
      var colDelim = '\t'
      var rowDelim = '\r\n'

      var csv = ["var","rsid","var.annot.INFO","consequence","gnomad.AF_fin","gnomad.AF_nfe",
                 "pheno","num_cases","num_controls",
                    "maf_case","maf_control","OR","pval"].join(colDelim) + rowDelim

      sTableData.forEach( function(variant) {
      	var af_fin ="NA"
		var af_nfe="NA"
		if( _.has(variant.var,'gnomad') ) {
			af_fin=variant.var.gnomad.AF_fin
			af_nfe=variant.var.gnomad.AF_nfe
		} 
	  	if (variant.significant_phenos.length === 0) {
	    	csv += [variant.var.id, variant.var.rsids, variant.var.annot.INFO, variant.var.annot.most_severe,
		      af_fin, af_nfe,
		      '', '', '', '', '', '', '', ''].join( colDelim ) + rowDelim
	  	} else {
			variant.significant_phenos.forEach( function(assoc, idx) {
		  csv += [variant.var.id, variant.var.rsids, variant.var.annot.INFO, variant.var.annot.most_severe, af_fin, af_nfe,
			  assoc.phenostring, assoc.n_case, assoc.n_control, assoc.maf_case,
			  assoc.maf_control,  Math.exp( assoc.beta ), assoc.pval.toExponential()].join( colDelim ) + rowDelim
              } )
	  }
      } )

      var createObjectURL = (window.URL || window.webkitURL || {}).createObjectURL || function(){}
      var csvFile = new Blob([csv], {type: "text/csv"});
      var csvData = createObjectURL(csvFile)
      $(this)
          .attr({
          'download': window.gene_symbol + "_functional_variants_assoc_p_threshold_1e-4.tsv"
          ,'href':csvData
              //,'target' : '_blank' //if you want it to open in a new window
      });

  });
})

$(function () {
    $("#genereport").click( function (event) {
        var working="Generating report..."

        if ( $('#genereport').text()==working ) {
          return
        }

            var request = new XMLHttpRequest();
            request.open('GET', '/genereport/' + window.gene_symbol, true);
            request.responseType = 'blob';
            $('#genereport').removeClass("enabled")
            $('#genereport').addClass("disabled")

            $('#genereport').text(working)
            $('#reportloader').css("display", "inline-block")

            request.onload = function() {
                // Only handle status code 200
                if(request.status === 200) {
                    // Try to find out the filename from the content disposition `filename` value
                    var disposition = request.getResponseHeader('content-disposition');
                    var blob = new Blob([request.response], { type: 'application/pdf' });
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = window.gene_symbol + "_genereport.pdf";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    $('#genereport-errorbox').css("display","none")
                    $('#genereport-errorbox').text("")
                    $('#genereport').removeClass("disabled")
                    $('#genereport').addClass("enabled")
                    $('#reportloader').css("display", "none")//show()
                    $('#genereport').text("Generate gene report")
                }
            }

            request.onreadystatechange = function() {//Call a function when the state changes.
                if(request.readyState == XMLHttpRequest.DONE && request.status != 200) {
                    $('#genereport-errorbox').css("display","inline-block")
                    $('#genereport-errorbox').text("Error while requesting gene report. " +request.status + " " + request.statusText )
                    $('#genereport').removeClass("disabled")
                    $('#genereport').addClass("enabled")
                    $('#reportloader').css("display", "none")//show()
                    $('#genereport').text("Generate gene report")
                }
            }

            request.onerror = function() {

            }

            request.send()
    })
})



$(function() {

    function gnomadize(variant) {
	var obj = variant.gnomad ? variant : variant.assoc ? variant.assoc : {}
	if (!obj.gnomad) {
            variant.fin_enrichment = 'No data in Gnomad'
	} else if (+obj.gnomad.AF_fin === 0) {
	    variant.fin_enrichment = 'No FIN in Gnomad'
	} else if (+obj.gnomad['AC_nfe_nwe'] + +obj.gnomad['AC_nfe_onf'] + +obj.gnomad['AC_nfe_seu'] == 0) {
	    variant.fin_enrichment = 'No NFEE in Gnomad'
	} else {
	    variant.fin_enrichment = +obj.gnomad['AC_fin'] / +obj.gnomad['AN_fin'] /
		( (+obj.gnomad['AC_nfe_nwe'] + +obj.gnomad['AC_nfe_onf'] + +obj.gnomad['AC_nfe_seu']) / (+obj.gnomad['AN_nfe_nwe'] + +obj.gnomad['AN_nfe_onf'] + +obj.gnomad['AN_nfe_seu']) )
	}
    }

    if (!window.gene_symbol) return
    $.getJSON('http://mygene.info/v3/query?q=' +  window.gene_symbol + '&fields=symbol%2Cname%2Centrezgene%2Censembl.gene%2CMIM%2Csummary&species=human')
        .done(function(result) {
            var mygene = {symbol:window.gene_symbol}
            if (result.hits && result.hits.length > 0) {
                mygene = result.hits[0]
            }
            if (mygene.MIM) {
                $('#omim-link').html('<a target="_blank" href="https://www.omim.org/entry/' + mygene.MIM + '">OMIM</a>')
            } else {
                $('#omim-link').html('<a target="_blank" href="https://www.omim.org/search/?index=entry&sort=score+desc%2C+prefix_sort+desc&start=1&limit=10&search=' + mygene.symbol + '">OMIM</a>')
            }
            $('#gtex-link').html(', <a target="_blank" href="https://www.gtexportal.org/home/eqtls/byGene?tissueName=All&geneId=' + mygene.symbol + '">GTEx</a>')
            if (mygene.ensembl && mygene.ensembl.gene) {
                $('#gnomad-link').html(', <a href="http://gnomad.broadinstitute.org/gene/' + mygene.ensembl.gene + '" target="_blank">gnomAD</a>')
                $('#opentarget-link').html(', <a href="https://www.targetvalidation.org/target/' + mygene.ensembl.gene + '" target="_blank">Opentarget</a>')
            }
            if (mygene.name) {
                $('#gene-description').html(mygene.name)
            }
            if (mygene.entrezgene) {
                $('#gene-summary')
                    .append('<a href="https://www.ncbi.nlm.nih.gov/gene/' + mygene.entrezgene + '" target="_blank">NCBI</a> ')
                    .append(mygene.summary || 'No description')
                $('#gene-summary').css({'background-color': '#f4f4f4', 'padding': '10px'})
            }
        })
    $('#assocloader').css('display', 'block')
    $.getJSON("/api/gene_phenos/" + window.gene_symbol)
	.done(function(data) {
	    data.forEach(function(variant) {
		gnomadize(variant.variant)
	    })
	    populate_streamtable(data);
	    $('#phenos_container').css('display', 'block')
	    $('#assocloader').css('display', 'none')
	})
	.fail(function(err) {
	    console.log(err)
	    console.log(JSON.parse(err.responseText))
	    $('#assocloader').html('Could not load association results')
	})
    $.getJSON("/api/drugs/" + window.gene_symbol)
	.done(function(data) {
	    if (data && data.length > 0) {
		populate_drugs_streamtable(data)
	    } else {
		$('#drugs-container').html('<span>No known drugs for ' + window.gene_symbol + '</span>')
		$('#drugs-container').css('display', 'block')
	    }
	})
    $.getJSON("/api/lof/" + window.gene_symbol)
    	.done(function(data) {
    	    if (data.length > 0) {
    		data = data.map(function(r) { return r.gene_data })
    		data.forEach(function(datum) {
    		    datum.variants = datum.variants.split(',').map(function (variant) {
    			    return variant.replace('chr', '').replace('_', ':').replace(/_/g, '-')
    		    }).join(',')
    		    datum.ref_alt_cases = datum.ref_count_cases + '/' + datum.alt_count_cases
    		    datum.ref_alt_ctrls = datum.ref_count_ctrls + '/' + datum.alt_count_ctrls
    		})
    		populate_lof_streamtable(data)
    	    } else {
    		$('#lof-container').html('<span>No loss of function variants for ' + window.gene_symbol + '</span>')
    		$('#lof-container').css('display', 'block')
    	    }
    	})
    $.getJSON("/api/gene_functional_variants/" + window.gene_symbol + "?p=" + window.func_var_report_p_threshold )
	.done(function(data) {
	    data.forEach(function(variant){
		variant.most_severe = variant.var.annot.most_severe.replace(/_/g, ' ').replace(' variant', '')
		variant.info = variant.var.annot.INFO
		variant.maf = variant.var.annot.AF < 0.5 ? variant.var.annot.af : 1 - variant.var.annot.AF
		gnomadize(variant.var)
	    })
	    populate_variant_streamtable(data)
	    $('#functional-variants-container').css('display', 'block')
	})

})

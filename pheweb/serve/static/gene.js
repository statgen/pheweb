'use strict';

function populate_variant_streamtable(data) {

    // data = _.sortBy(data, _.property('pval'));
    var template = _.template($('#streamtable-functional-variants-template').html());
    var view = function(v) {
        return template({v: v});
    };

    var options = {
        view: view,
        search_box: false,
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
}

function populate_streamtable(data) {
    $(function() {
        var template = _.template($('#streamtable-template').html());
        var view = function(p) {
            return template({p: p});
        };

	var fields = function(item) {
	    return [
		item.pheno.phenocode,
		item.pheno.phenostring,
		item.pheno.category,
		item.assoc.rsid
	    ].join(' ')
	}

        var options = {
            view: view,
            search_box: '#search',
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
    });
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
  $("#export_func_vars").click( function (event) {
      // export so that variant vs. assoc gets repeated....
      //exportTableToCSV.apply(this, [$('#stream_table_functional_variants'),window.gene_symbol + "_functional_variants.tsv"])
      var sTableData = $('#stream_table_functional_variants').data('st').getData()
      var colDelim = '\t'
      var rowDelim = '\r\n'

      var csv = ["var","rsid","info","consequence",
                    "pheno","num_cases","num_controls",
                    "maf_case","maf_control","OR","pval"].join(colDelim) + rowDelim

      sTableData.forEach( function(variant) {
          variant.significant_phenos.forEach( function(assoc, idx) {
              csv += [variant.id, variant.rsids, variant.info, variant.most_severe, assoc.pheno.phenostring,
                  assoc.pheno.num_cases, assoc.pheno.num_controls, assoc.assoc.maf_case,
                  assoc.assoc.maf_control,  Math.exp( assoc.assoc.beta ), assoc.assoc.pval.toExponential()].join( colDelim ) + rowDelim
          } )
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
                    console.log(request)
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
    if (!window.gene_symbol) return
    $.getJSON('http://rest.ensembl.org/xrefs/symbol/human/' + window.gene_symbol + '?content-type=application/json')
        .done(function(result) {
    	    if (result.length > 0) {
                var url = 'http://gnomad.broadinstitute.org/gene/' + result[0].id
                $('#gnomad-link').html(', <a href=' + url + ' target="_blank">gnomAD</a>')
                var url = 'https://www.targetvalidation.org/target/' + result[0].id
                $('#opentarget-link').html(', <a href=' + url + ' target="_blank">Opentarget</a>')
    	    } else {
                console.log(window.gene_symbol + ' not found in ensembl')
    	    }
        });
    $.getJSON("/api/gene_phenos/" + window.gene_symbol)
	.done(function(data) {
	    populate_streamtable(data);
	})
	.fail(function() {
	    console.log('/api/gene_phenos failed')
	});
    $.getJSON("/api/gene_functional_variants/" + window.gene_symbol + "?p=" + window.func_var_report_p_threshold )
	.done(function(data) {
	    data.forEach(function(variant) {
		variant.most_severe = variant.var_data.most_severe.replace(/_/g, ' ').replace(' variant', '')
		variant.info = variant.var_data.info
		variant.maf = variant.var_data.af < 0.5 ? variant.var_data.af : 1 - variant.var_data.af
	    })
	    populate_variant_streamtable(data);
	})
	.fail(function() {
	    console.log('/api/gene_functional_variants failed');
	});
    $.getJSON("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=("
	      + window.gene_symbol
	      + "[gene])%20AND%20(Homo%20sapiens[orgn])%20AND%20alive[prop]%20NOT%20newentry[gene]&sort=weight&retmode=json")
	.done(function(data) {
	    if (data.esearchresult && +data.esearchresult.count > 0) {
		var entrezId = data.esearchresult.idlist[0]
		$.getJSON("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id="
			  + entrezId + "&retmode=json")
		    .done(function(data) {
			$('#gene-description').html(data.result[entrezId].description)
			$('#gene-summary')
			    .append('<a href="https://www.ncbi.nlm.nih.gov/gene/' + entrezId + '" target="_blank">NCBI</a> ')
			    .append(data.result[entrezId].summary)
			$('#gene-summary').css({'background-color': '#f4f4f4', 'padding': '10px'})
		    })
	    } else {
		console.log(window.gene_symbol + ' not found in ncbi')
	    }
	})
	.fail(function() {
	    console.log('NCBI gene lookup failed')
	});
})

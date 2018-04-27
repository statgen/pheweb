'use strict';

window.debug = window.debug || {};

(function() {
    // It's unfortunate that these are hard-coded, but it works pretty great, so I won't change it now.
    var autocomplete_bloodhound = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('display'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        identify: function(sugg) { return sugg.display; }, // maybe allows Bloodhound to `.get()`  objects
        remote: {
            url: '/api/autocomplete?query=%QUERY',
            wildcard: '%QUERY',
            rateLimitBy: 'throttle',
            rateLimitWait: 500,
            transform: function(data) {
                // Probably this function reveals that I don't understand Bloodhound.
                // But, I want my previous results to stay around while I keep typing.
                // If the string that's currently in the searchbox matches some string that's been suggested before, I want to see it!
                // This especially happens while I'm typing a chrom-pos-ref-alt.  If what I'm typing agrees with something being suggested, it shouldn't disappear!
                // So, I'm just adding everything to the local index. (Note: NOT localstorage.)
                // Bloodhound appears to perform deduping.
                autocomplete_bloodhound.add(data);
                return data;
            },
        },
        sorter: function(a, b) { return (a.display > b.display) ? 1 : -1; },
    });

    $(function() {
        $('.typeahead').typeahead({
            hint: false,
            highlight: true,
            minLength: 1,
        }, {
            name: 'autocomplete',
            source: autocomplete_bloodhound,
            display: 'value',
            limit: 100,
            templates: {
                suggestion: _.template("<div><%= display %></div>"),
                empty: "<div class='tt-empty-message'>No matches found.</div>"
            }
        });

        $('.typeahead').bind('typeahead:select', function(ev, suggestion) {
            window.location.href = suggestion.url;
        });
    });
})();


// convenience functions
function fmt(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) {
        return (typeof args[number] != 'undefined') ? args[number] : match;
    });
}

// deal with IE11 problems
if (!Math.log10) { Math.log10 = function(x) { return Math.log(x) / Math.LN10; }; }
if (!!window.MSInputMethodContext && !!document.documentMode) { /*ie11*/ $('<style type=text/css>.lz-locuszoom {height: 400px;}</style>').appendTo($('head')); }

// nice scientific notation
function pValueToReadable(p) {
    if (!_.isNumber(p)) {
	return NaN
    }
    var pReadable = p
    if (p === Number.MIN_VALUE) {
	pReadable = '< ' + pReadable
    } else if (p < 0.01) {
    	pReadable = pReadable.toExponential(1)
	var expIndex = pReadable.indexOf('e')
	var base = pReadable.substring(0, expIndex)
	var exponent = pReadable.substring(expIndex + 1)
	// TODO vertically align 'x' to middle (vertical-align, line-height, padding don't seem to work)
	pReadable = base + ' <span style="font-size: 0.675em">x</span> 10<sup>' + exponent + '</sup>'
    } else {
	pReadable = pReadable.toPrecision(1)
    }
    return pReadable
}


function exportTableToCSV($table, filename) {
    var sTableData = $table.data('st').getData()
    var colDelim = ','
    var rowDelim = '\r\n'
    var vals = sTableData[1]
    var csv = Object.keys(sTableData[0]).join(colDelim)
    csv+=rowDelim
    csv+=sTableData.map( function( row ) { return Object.values(row).join(colDelim) }).join(rowDelim)
    var createObjectURL = (window.URL || window.webkitURL || {}).createObjectURL || function(){}
    var csvFile = new Blob([csv], {type: "text/csv"});
    console.log(this)
    var csvData = createObjectURL(csvFile)
    $(this)
        .attr({
        'download': filename
        ,'href':csvData
            //,'target' : '_blank' //if you want it to open in a new window
    });
}

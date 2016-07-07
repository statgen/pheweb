$(function() {

// Define LocusZoom Data Sources object
var localBase = "/api/region/" + window.pheno.pheno_code + "/lz-";
var remoteBase = "http://portaldev.sph.umich.edu/api/v1/";
var data_sources = new LocusZoom.DataSources();
data_sources.add("base", ["AssociationLZ", localBase]);
data_sources.add("ld", ["LDLZ" ,remoteBase + "pair/LD/"]);
data_sources.add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", params: {source: 2} }]);
data_sources.add("sig", ["StaticJSON", [{ "x": 0, "y": 4.522 }, { "x": 2881033286, "y": 4.522 }] ])
data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: 15} }])

//data_sources.add("recomb", ["RecombLZ", { url: apiBase + "annotation/recomb/results/", params: {source: 15}])
var my_layout = {
    resizable: "responsive",
    panels: {
        positions: {
            data_layers: {
                positions: {
                    fields: ["id", "position", "pvalue|scinotation", "pvalue|neglog10", "maf", "ld:state"],
                    id_field: "id",
                    tooltip: {
                        html: "<strong>{{id}}</strong><br>" +
                            "P-value: <strong>{{pvalue|scinotation}}</strong><br>" +
                            "MAF: <strong>{{maf}}</strong>"
                    }
                }
            }
        }
    }
};
var layout = LocusZoom.mergeLayouts(my_layout, LocusZoom.StandardLayout);


// Populate the div with a LocusZoom plot using the default layout
var plot = LocusZoom.populate("#lz-1", data_sources, layout);


// Apply form data to a remapping of the demo LocusZoom instance
function handleFormSubmit(lz_id){
    //var chr   = $("#" + lz_id + "_chr")[0].value;
    //var start = $("#" + lz_id + "_start")[0].value;
    //var end   = $("#" + lz_id + "_end")[0].value;
    var target =  $("#" + lz_id + "_region")[0].value.split(":");
    var chr = target[0];
    var pos = target[1];
    var start = 0;
    var end = 0;
    if ( pos.match(/[-+]/) ) {
        if (pos.match(/[-]/)) {
            pos = pos.split("-");
            start = +pos[0];
            end = +pos[1];
        } else {
            pos = pos.split("+");
            start = (+pos[0]) - (+pos[1]);
            end = (+pos[0]) + (+pos[1]);
        }
    } else {
        start = +pos - 300000
        end = +pos + 300000
    }
    plot.applyState({ chr: chr, start: start, end: end});
}

function jumpTo(region) {
    var target = region.split(":");
    var chr = target[0];
    var pos = target[1];
    var start = 0;
    var end = 0;
    if (!pos.match(/[-+]/)) {
        start = +pos - 300000
        end = +pos + 300000
    }
    plot.applyState({ chr: chr, start: start, end: end, ldrefvar: "" });
    populateForms();
    return(false);
}

// Fill demo forms with values already loaded into LocusZoom objects
function populateForms(){
    $("#lz-1_region")[0].value = plot.state.chr + ":"
        + plot.state.start + "-"
        + plot.state.end;
}
populateForms();

});
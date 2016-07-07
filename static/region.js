(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.pheno_code + "/lz-";
    var remoteBase = "http://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("base", ["AssociationLZ", localBase]);
//    data_sources.add("ld", ["LDLZ" ,remoteBase + "pair/LD/"]);
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
//                        fields: ["id", "position", "rsid", "pvalue|scinotation", "pvalue|neglog10", "maf", "ld:state"],
                        fields: ["id", "chr", "position", "ref", "alt", "rsid", "pvalue|scinotation", "pvalue|neglog10", "maf"],
                        id_field: "id",
                        tooltip: {
                            html: "<strong>{{id}}</strong><br>" +
                                "<strong>{{rsid}}</strong><br>" +
                                "P-value: <strong>{{pvalue|scinotation}}</strong><br>" +
                                "MAF: <strong>{{maf}}</strong><br>" +
                                "<a href='/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}'>PheWAS</a>"
                        }
                    }
                }
            }
        }
    };
    var layout = LocusZoom.mergeLayouts(my_layout, LocusZoom.StandardLayout);

    function move(direction) {
        // 1 means right, -1 means left.
        var start = window.plot.state.start;
        var end = window.plot.state.end;
        var shift = Math.floor((end - start) / 2) * direction;
        window.plot.applyState({
            chr: window.plot.state.chr,
            start: start + shift,
            end: end + shift
        });
    }

    function zoom(length_ratio) {
        // 2 means bigger view, 0.5 means zoom in.
        var start = window.plot.state.start;
        var end = window.plot.state.end;
        var center = (end + start) / 2;
        start = Math.floor(center + (start - center) * length_ratio);
        start = Math.max(0, start);
        end = Math.floor(center + (end - center) * length_ratio);
        window.plot.applyState({
            chr: window.plot.state.chr,
            start: start,
            end: end,
        });
    }

    $(function() {
        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, layout);

        $('#move-left').on('click', function() { move(-0.5); });
        $('#move-left-fast').on('click', function() { move(-1.5); });
        $('#move-right').on('click', function() { move(0.5); });
        $('#move-right-fast').on('click', function() { move(1.5); });
        $('#zoom-out').on('click', function() { zoom(2); });
        $('#zoom-in').on('click', function() { zoom(0.5); });
    });
})();

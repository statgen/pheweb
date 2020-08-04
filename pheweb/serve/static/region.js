'use strict';

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var recomb_source = window.genome_build == 37 ? 15 : 16
    
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld",
								   params: { id:[1,4] ,
									     pvalue_field: "association:pvalue",
									     "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
								   params: { id:[1,4] ,pvalue_field: "association:pvalue",
									     "var_id_field":"association:rsid" }}));
    }	
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: recomb_source} }]);

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    LocusZoom.TransformationFunctions.set("log_pvalue", function(x) {
        return x
    });

    LocusZoom.TransformationFunctions.set("logneglog", function(x) {
	var pScaled = -Math.log10(x)
	if (pScaled > window.vis_conf.loglog_threshold) {
	    pScaled = window.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(window.vis_conf.loglog_threshold)
	}
	return pScaled
    })
    
    // dashboard components
    function add_dashboard_button(name, func) {
        LocusZoom.Dashboard.Components.add(name, function(layout){
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new LocusZoom.Dashboard.Component.Button(this)
                    .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                    .setOnclick(func(layout).bind(this));
                this.button.show();
                return this.update();
            };
        });
    }
    /*
    add_dashboard_button('link', function(layout) {
        return function() {
            window.location.href = layout.url;
        };
    });

    add_dashboard_button('move', function(layout) {
        // see also the default component `shift_region`
        return function() {
            var start = this.parent_plot.state.start;
            var end = this.parent_plot.state.end;
            var shift = Math.floor(end - start) * layout.direction;
            this.parent_plot.applyState({
                chr: this.parent_plot.state.chr,
                start: start + shift,
                end: end + shift
            });
        }
    });
    */        
    window.debug.data_sources = data_sources;
    $(function() {
        window.plot = LocusZoom.populate("#lz-1", data_sources, window.region_layout);
	window.plot.addPanel(window.panel_layouts.association)
    });

})();

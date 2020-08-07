import { Layouts , Data , createCORSPromise , DataSources , TransformationFunctions , Dashboard , populate } from 'locuszoom';
import { region_layout ,  association_layout } from './legacy_layout';
import { Region } from './components';

TransformationFunctions.set("neglog10_or_100", function(x) {
    if (x === 0) return 100;
    var log = -Math.log(x) / Math.LN10;
    return log;
});

TransformationFunctions.set("log_pvalue", function(x) {
    return x
});

TransformationFunctions.set("logneglog", function(x) {
console.assert(this.params && this.params && this.params.region && this.params.region.vis_conf , 'missing vis_conf')
if (pScaled > this.params.region.vis_conf.loglog_threshold) {
    pScaled = this.params.region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(this.params.region.vis_conf.loglog_threshold)
}
return pScaled
})

export const init_locus_zoom = (region : Region) => {
    // Define LocusZoom Data Sources object
    var localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    var remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources : DataSources = new DataSources();

    var recomb_source : number = region.genome_build == 37 ? 15 : 16
    var gene_source : number = region.genome_build == 37 ? 2 : 1
    //data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    
    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new Data.FG_LDDataSource({url: "/api/ld",
							 params: { id:[1,4] ,
								   region: region,
								   pvalue_field: "association:pvalue",
								   "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
							 params: { id:[1,4] ,
								   region: region,
								   pvalue_field: "association:pvalue",
								   "var_id_field":"association:rsid" }}));
    }
    data_sources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recomb_source} }]);

    
    // dashboard components
    function add_dashboard_button(name, func) {
        Dashboard.Components.add(name, function(layout){
            Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new Dashboard.Component.Button(this)
                    .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                    .setOnclick(func(layout).bind(this));
                this.button.show();
                return this.update();
            };
        });
    }

    const plot = populate("#lz-1", data_sources, region_layout);
    plot.addPanel(association_layout(region));
};

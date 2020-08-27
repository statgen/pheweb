import { Layouts , Data , createCORSPromise , DataSources , TransformationFunctions , Dashboard , populate, Plot } from 'locuszoom';
import { region_layout ,  association_layout , genes_layout , clinvar_layout , gwas_cat_layout , finemapping_layout , colocalization_layout } from './region_layouts';
import { FG_LDDataSource , GWASCatSource , ClinvarDataSource } from './custom_locuszooms';
import { Region } from './components';

TransformationFunctions.set("neglog10_or_100", function(x : number) {
    if (x === 0) return 100;
    var log = -Math.log(x) / Math.LN10;
    return log;
});

TransformationFunctions.set("log_pvalue", function(x: number) {
    return x
});

TransformationFunctions.set("logneglog", function(x) {
console.assert(this.params && this.params && this.params.region && this.params.region.vis_conf , 'missing vis_conf')
var pScaled : number = -Math.log10(x)
if (pScaled > this.params.region.vis_conf.loglog_threshold) {
    pScaled = this.params.region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(this.params.region.vis_conf.loglog_threshold)
}
return pScaled
})

TransformationFunctions.set("percent", function(n : number) {
    if (n === 1) { return "100%"; }
    var x : string = (n*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

export interface LocusZoomContext {
    plot : Plot
    dataSources : DataSources
}

export const init_locus_zoom = (region : Region) : LocusZoomContext =>  {
    // Define LocusZoom Data Sources object
    const localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    const localCondBase : string = "/api/conditional_region/" + region.pheno.phenocode + "/lz-";
    const localFMBase : string = "/api/finemapped_region/" + region.pheno.phenocode + "/lz-";
    const localColocalizationBase : string = "/api/colocalization/" + region.pheno.phenocode + "/lz-";
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const dataSources : DataSources = new DataSources();
    
    const recombSource : number = region.genome_build == 37 ? 15 : 16
    const geneSource : number = region.genome_build == 37 ? 2 : 1
    const gwascatSource : Array<number> = region.genome_build == 37 ? [2,3] : [1,4]

    dataSources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    dataSources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    dataSources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    dataSources.add("colocalization", ["ColocalizationLZ", {url: localColocalizationBase, params:{trait_fields: ['colocalization:pip1', 'colocalization:pip2', 'colocalization:beta1', , 'colocalization:beta2']}}]);

    dataSources.add("gene", ["GeneLZ", {url: `${remoteBase}annotation/genes/`, params:{source:geneSource}}])   
    
    dataSources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    dataSources.add("gwas_cat", new GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:gwascatSource ,pvalue_field: "log_pvalue" }}));
    dataSources.add("clinvar", new ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { region:region , id:[1,4] ,pvalue_field: "log_pvalue" }}));  
    
    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	dataSources.add("ld", new FG_LDDataSource({url: "/api/ld",
						   params: { id:[1,4] ,
							     region: region,
							     pvalue_field: "association:pvalue",
							     var_id_field: "association:id" }}));
    } else {
	dataSources.add("ld", new FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
							 params: { id:[1,4] ,
								       region: region,
								       pvalue_field: "association:pvalue",
								       var_id_field: "association:rsid" }}));
    }
    dataSources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recombSource} }]);

    
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

    add_dashboard_button('link', function(layout) {
        return function() {
            window.location.href = layout.url;
        };
    });

    add_dashboard_button('move', function(layout) {
        // see also the sefault component `shift_region`
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

    const plot : Plot = populate("#lz-1", dataSources, region_layout(region));
    plot.addPanel(association_layout(region));
    plot.addPanel(clinvar_layout(region));
    plot.addPanel(gwas_cat_layout(region));
    plot.addPanel(genes_layout(region));
    plot.addPanel(finemapping_layout(region));
    plot.addPanel(colocalization_layout(region));

    return { plot , dataSources }
};

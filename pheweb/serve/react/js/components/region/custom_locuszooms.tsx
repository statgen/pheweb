import {DataSources, Dashboard, Data, TransformationFunctions, positionIntToString, createCORSPromise } from 'locuszoom';
import { defer , when } from 'q';

export const FG_LDDataSource = Data.Source.extend(function(init) {
    this.parseInit(init);
}, "FG_LDDataSourceLZ");

// https://rest.ensembl.org/info/variation/populations/homo_sapiens?content-type=application/json;filter=LD
// ld/:species/:id/:population_name
FG_LDDataSource.prototype.getURL = function(state, chain, fields) {

    var findExtremeValue = function(x, pval, sign) {
        pval = pval || "pvalue";
        sign = sign || 1;
        var extremeVal = sign * x[0][pval], extremeIdx=0;
        for(var i=1; i<x.length; i++) {
            if (x[i][pval] * sign > extremeVal) {
                extremeVal = x[i][pval] * sign;
                extremeIdx = i;
            }
        }
        return extremeIdx;
    };

    var extremeIdx = findExtremeValue(  chain.body, this.params.pvalue_field, -1 )
    var topvar = chain.body[extremeIdx]
    var refvar=topvar[this.params.var_id_field]
    chain.header.ldrefvar = topvar
    if (this.params.region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	var windowSize = Math.min(state.end - state.start + 10000, this.params.region.lz_conf.ld_max_window)
	return this.url + "?variant=" + topvar['association:chr'] + ':' + topvar['association:position'] + ':' + topvar['association:ref'] + ':' + topvar['association:alt'] + "&window=" + windowSize + "&panel=sisu3"
    } else {
	return refvar ? this.url + refvar + "/" + this.params.region.lz_conf.ld_ens_pop + "?window_size=" + this.params.region.lz_conf.ld_ens_window : this.url + ' lead variant has no rsid, could not get LD'
    }

};

FG_LDDataSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    // if ld was not fetched, return the previous chain skipping this data source
    if (!resp) return chain

    var res
    if (this.params.region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	res = JSON.parse(resp)['ld']
    } else {
	res = JSON.parse(resp)
    }
    var lookup = {}
    for (var i = 0; i < res.length; i++) {
	res[i].variation1 = res[i].variation1.replace(/^23:/, 'X:')
	res[i].variation2 = res[i].variation2.replace(/^23:/, 'X:')
        lookup[ res[i].variation2 ] = res[i];
    }

    var ld_field = outnames[ fields.indexOf("state") ]
    var reffield = outnames[ fields.indexOf("isrefvar") ]

    for (var i = 0; i < chain.body.length; i++) {

	var d, isref
	if (this.params.region.lz_conf.ld_service.toLowerCase() == 'finngen') {
            d = lookup[chain.body[i][this.params.var_id_field].replace('_', ':').replace('/', ':')]
	    isref = chain.header.ldrefvar[this.params.var_id_field] == chain.body[i][this.params.var_id_field] ? 1:0
	} else {
	    d = lookup[chain.body[i][this.params.var_id_field]]
	    isref = chain.header.ldrefvar[this.params.var_id_field] == chain.body[i][this.params.var_id_field]? 1:0
	}
	
        if( d != null ) {
            chain.body[i][ld_field] = d.r2;
            chain.body[i][reffield] = isref
        }

        if(isref==1) {
            chain.body[i][ld_field] = 1
            chain.body[i][reffield] = isref
        }
    };

    return { header: chain.header, body:chain.body}

}

FG_LDDataSource.prototype.fetchRequest = function(state, chain, fields) {
    var url = this.getURL(state, chain, fields);
    var headers = {
        "Content-Type": "application/json"
    };
    
    return url ? createCORSPromise("GET", url, {}, headers) : defer()
    
};

import {DataSources, Dashboard, Data, TransformationFunctions, positionIntToString, createCORSPromise } from 'locuszoom';

export const GWASCatSource = Data.Source.extend(function(init : any) {  this.parseInit(init); }, "GWASCatSourceLZ");
Data.GWASCatSource = GWASCatSource;

GWASCatSource.prototype.getURL = function(state, chain : any, fields : any) {

    return this.url + "results/?format=objects&filter=id in " + this.params.id   +
        " and chrom eq  '" + state.chr + "'" +
        " and pos ge " + state.start +
        " and pos le " + state.end
};

GWASCatSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    var res = []
    try {
        res = JSON.parse(resp)
    } catch (e) {
        resp = resp.replace(/Infinity/g,'"Inf"');
        res = JSON.parse(resp)
    }

    if( res.data.length==0) {
        // gotta have mock variant in correct format so LD search does not internal server error
        var dat = outnames.reduce(  function(acc : any, curr : any, i : number) { acc[curr]="0:0_a/t"; return acc }, {} )
        return {header: chain.header, body:[dat] };
    } else {
        res.data.forEach(d => { d.id = d.variant })
        return Data.Source.prototype.parseResponse.call(this, res, chain, fields, outnames, trans);
    }
}

export const ClinvarDataSource = (genome_build : number) => { 
    const source = Data.Source.extend(function(init) { this.parseInit(init); }, "ClinvarDataSourceLZ");
    source.genome_build = genome_build;
    source.getURL = function(state, chain, fields) {
        return this.url
    };
    source.fetchRequest = function(state, chain, fields) {

        var url = this.getURL(state, chain, fields);
    
        var headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        };
        var requrl = url + "esearch.fcgi?db=clinvar&retmode=json&term=" + state.chr + "[chr]" + state.start + ":" + state.end + '[' + (this.genome_build == 37 ? 'chrpos37' : 'chrpos') + ']%22clinsig%20pathogenic%22[Properties]&retmax=500'
        return createCORSPromise("GET", requrl).then(function( resp) {
    
            var data = JSON.parse(resp);
    
            if(data.esearchresult.count==0) {
                var res = Q.defer()
                res.resolve( '{ "noresults":"","pos":' + state.start + ' }'  )
                return res.promise
            }
    
            if (data.esearchresult.idlist != null) {
                var requrl = url + "esummary.fcgi?db=clinvar&retmode=json&id=" + data.esearchresult.idlist.join(",")
                return createCORSPromise("GET", requrl)
            } else {
                var res = Q.defer()
                console.log( "Failed to query clinvar" + JSON.stringify(data, null, 4 ) )
                res.reject("Failed to query clinvar" + JSON.stringify(data, null, 4 ))
                return res
            }
        }
        );
    };
    source.parseResponse = function(resp, chain, fields, outnames, trans) {

        if (resp == '') {
            // locuszoom does not show even axis titles if there are no data visible.
            // make a mock element with id-1 which is set to invisible in the layout
            var dat = fields.reduce(  function(acc, curr, i) { acc[curr]=-1; return acc }, {} )
            return {header: chain.header, body:[dat] };
        }
        
        var data = JSON.parse(resp)
        
        if( data.noresults != null) {
            // locuszoom does not show even axis titles if there are no data visible.
            // make a mock element with id-1 which is set to invisible in the layout
            var dat = fields.reduce(  function(acc, curr, i) { acc[curr]=-1; return acc }, {} )
            return {header: chain.header, body:[dat] };
        }
    
        if (data.result==null) {
                throw "error while processing clinvar:" +  data.esummaryresult
        }
        var respData = []
        Object.entries(data.result).filter(function(x) {return x[0]!="uids"} ).forEach(function(val){
    
            val = val[1]
            var loc = val.variation_set[0].variation_loc.filter(function(x)  {return x.assembly_name=="GRCh38"} )[0]
            if( loc != null) {
                const object= { start : loc.start,
                              stop : loc.stop,
                              ref : loc.ref,
                              alt : loc.alt,
                              chr : loc.chr,
                              varName : val.variation_set[0].variation_name,
                              clinical_sig : val.clinical_significance.description,
                              trait : val.trait_set.map( function(x) { return x.trait_name } ).join(":"),
                              y : 5,
                              id : val.uid,
                              'clinvar:id' : loc.chr + ':' + loc.start + '_' + loc.ref + '/' + loc.alt }
    
                respData.push( object )
            }
    
        });
        return {header: chain.header, body: respData};
    };
    
    return source;
};
Data.ClinvarDataSource = ClinvarDataSource;

Data.Source.prototype.getData = function(state, fields, outnames, trans) {

    if (this.preGetData) {
        var pre = this.preGetData(state, fields, outnames, trans);
        if(this.pre) {
            state = pre.state || state;
            fields = pre.fields || fields;
            outnames = pre.outnames || outnames;
            trans = pre.trans || trans;
        }
    }

    var self = this;
    return function (chain) {
        if (self.dependentSource && chain && chain.body && !chain.body.length) {
            // A "dependent" source should not attempt to fire a request if there is no data for it to act on.
            // Therefore, it should simply return the previous data chain.
            return Q.when(chain);
        }

        self.getRequest(state, chain, fields)
        
        return self.getRequest(state, chain, fields).then(function(resp) {
            return self.parseResponse(resp, chain, fields, outnames, trans);
        });
    };
};

const FG_LDDataSource = (lz_conf) => {
    const source = Data.Source.extend(function(init) {  this.parseInit(init); }, "FG_LDDataSourceLZ");
    source.getURL = function(state, chain, fields) {

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
        if (lz_conf.ld_service.toLowerCase() == 'finngen') {
            var windowSize = Math.min(state.end - state.start + 10000, lz_conf.ld_max_window)
            return this.url + "?variant=" + topvar['association:chr'] + ':' + topvar['association:position'] + ':' + topvar['association:ref'] + ':' + topvar['association:alt'] + "&window=" + windowSize + "&panel=sisu3"
        } else {
            return refvar ? this.url + refvar + "/" + lz_conf.ld_ens_pop + "?window_size=" + lz_conf.ld_ens_window : this.url + ' lead variant has no rsid, could not get LD'
        }
    
    };
    // https://rest.ensembl.org/info/variation/populations/homo_sapiens?content-type=application/json;filter=LD
    // ld/:species/:id/:population_name
    source.parseResponse = function(resp, chain, fields, outnames, trans) {

        // if ld was not fetched, return the previous chain skipping this data source
        if (!resp) return chain
    
        var res
        if (lz_conf.ld_service.toLowerCase() == 'finngen') {
            res = JSON.parse(resp)['ld']
        } else {
            res = JSON.parse(resp)
        }
        var lookup : { [key: string]: string; } = {}
        for (var i = 0; i < res.length; i++) {
            res[i].variation1 = res[i].variation1.replace(/^23:/, 'X:')
            res[i].variation2 = res[i].variation2.replace(/^23:/, 'X:')
            lookup[res[i].variation2 ] = res[i];
        }
    
        var ld_field = outnames[ fields.indexOf("state") ]
        var reffield = outnames[ fields.indexOf("isrefvar") ]
    
        for (var i = 0; i < chain.body.length; i++) {
    
            var d, isref
            if (lz_conf.ld_service.toLowerCase() == 'finngen') {
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
    source.fetchRequest = function(state, chain, fields) {
        var url = this.getURL(state, chain, fields);
        var headers = {
            "Content-Type": "application/json"
        };
        
        return url ? createCORSPromise("GET", url, {}, headers) : Q.defer()
    
    };
        
    return source;
}
Data.FG_LDDataSource = FG_LDDataSource

export const ConditionalSource = Data.Source.extend(function(init) {
    this.parseInit(init);
}, "ConditionalLZ");
Data.ConditionalSource = ConditionalSource;

ConditionalSource.prototype.preGetData = function(state, fields, outnames, trans) {
    var id_field = this.params.id_field || "id";
    [id_field, "position"].forEach(function(x) {
        if (fields.indexOf(x)==-1) {
            fields.unshift(x);
            outnames.unshift(x);
            trans.unshift(null);
        }
    });
    return {fields: fields, outnames:outnames, trans:trans};
};

ConditionalSource.prototype.getURL = function(state, chain, fields) {
    var analysis = state.analysis || chain.header.analysis || this.params.analysis || 3;
    return this.url + "results/?filter=analysis in " + analysis  +
        " and chromosome in  '" + state.chr + "'" +
        " and position ge " + state.start +
        " and position le " + state.end;
};


ConditionalSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    this.params.allData = JSON.parse(resp)
    this.params.dataIndex = this.params.dataIndex || 0
    this.params.fields = fields
    this.params.outnames = outnames
    this.params.trans = trans

    var res = this.params.allData
    var lookup : { [key: string]: string | number | undefined; } = {}
    for (var i = 0; i < chain.body.length; i++) {
        lookup[chain.body[i]['id']] = i
    }
    for (var f = 0; f < this.params.trait_fields.length; f++) {
        var field = this.params.trait_fields[f]
        for (var r = 0; r < res.length; r++) {
            res[r].data[field] = []
            for (var i = 0; i < res[r].data.id.length; i++) {
                const idx = lookup[res[r].data.id[i]]
                if (idx !== undefined) {
                    res[r].data[field].push(chain.body[idx][field])
                } else {
                    res[r].data[field].push('n/a')
                }
            }
        }
        fields.push(field)
        outnames.push(field)
    }
    
    return Data.Source.prototype.parseResponse.call(this, this.params.allData[this.params.dataIndex], chain, fields, outnames, trans);
}


export const FineMappingSource = Data.Source.extend(function(init) { this.parseInit(init);}, "FineMappingLZ");
FineMappingSource.prototype.preGetData = ConditionalSource.prototype.preGetData
FineMappingSource.prototype.getURL = ConditionalSource.prototype.getURL
FineMappingSource.prototype.parseResponse 

TransformationFunctions.set("percent", function(x : number) {
    if (x === 1) { return "100%"; }
    const x_scaled = (x*100).toPrecision(2);
    var x_string = x_scaled.toString()
    if (x_string.indexOf('.') !== -1) { x_string = x_string.replace(/0+$/, ''); }
    if (x_string.endsWith('.')) { x_string = x_string.substr(0, x.length-1); }
    return x_string + '%';
});

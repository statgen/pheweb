LocusZoom.Data.GWASCatSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, "GWASCatSourceLZ");


LocusZoom.Data.GWASCatSource.prototype.getURL = function(state, chain, fields) {

    return this.url + "results/?format=objects&filter=id in " + this.params.id   +
        " and chrom eq  '" + state.chr + "'" +
        " and pos ge " + state.start +
        " and pos le " + state.end
};


LocusZoom.Data.GWASCatSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    var res =""
    try {
        res = JSON.parse(resp)
    } catch (e) {
        resp = resp.replace(/Infinity/g,'"Inf"');
        res = JSON.parse(resp)
    }

    if( res.data.length==0) {
        // gotta have mock variant in correct format so LD search does not internal server error
        var dat = outnames.reduce(  function(acc, curr, i) { acc[curr]="0:0_a/t"; return acc }, {} )
        return {header: chain.header, body:[dat] };
    } else {
        return LocusZoom.Data.Source.prototype.parseResponse.call(this,resp, chain, fields, outnames, trans);
    }
}


LocusZoom.Data.ClinvarDataSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, "ClinvarDataSourceLZ");


LocusZoom.Data.ClinvarDataSource.prototype.getURL = function(state, chain, fields) {
    return this.url
};


LocusZoom.Data.ClinvarDataSource.prototype.fetchRequest = function(state, chain, fields) {

    var url = this.getURL(state, chain, fields);

    var headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    };
    var requrl = url + "esearch.fcgi?db=clinvar&retmode=json&term=" + state.chr + "[chr]" + state.start + ":" + state.end + '[chrpos]%22clinsig%20pathogenic%22[Properties]&retmax=500'
    return LocusZoom.createCORSPromise("GET", requrl).then(function( resp) {

        var data = JSON.parse(resp);

        if(data.esearchresult.count==0) {
            var res = Q.defer()
            res.resolve( '{ "noresults":"","pos":' + state.start + ' }'  )
            return res.promise
        }

        if (data.esearchresult.idlist != null) {
            var requrl = url + "esummary.fcgi?db=clinvar&retmode=json&id=" + data.esearchresult.idlist.join(",")
            return LocusZoom.createCORSPromise("GET", requrl)
        } else {
            var res = Q.defer()
            console.log( "Failed to query clinvar" + JSON.stringify(data, null, 4 ) )
            res.reject("Failed to query clinvar" + JSON.stringify(data, null, 4 ))
            return res
        }
    }
    );
};

LocusZoom.Data.ClinvarDataSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

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
            var object= {}
            object.start = loc.start;
            object.stop = loc.stop;
            object.ref = loc.ref;
            object.alt = loc.alt;
            object.chr = loc.chr
            object.varName = val.variation_set[0].variation_name;
            object.clinical_sig = val.clinical_significance.description;
            object.trait = val.trait_set.map( function(x) { return x.trait_name } ).join(":")
            object.y= 5
            object.id = val.uid;

            respData.push( object )
        }

    });
    return {header: chain.header, body: respData};
};


LocusZoom.Data.GeneConstraintSource.prototype.fetchRequest = function(state, chain, fields) {
    var geneids = [];
    chain.body.forEach(function(gene){
        var gene_id = gene.gene_id;
        if (gene_id.indexOf(".")){
            gene_id = gene_id.substr(0, gene_id.indexOf("."));
        }
        geneids.push(gene_id);
    });
    var url = this.getURL(state, chain, fields);
    var body = "geneids=" + encodeURIComponent(JSON.stringify(geneids));
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    };
    return LocusZoom.createCORSPromise("POST", this.url, body, headers);

};

LocusZoom.Data.AssociationSource.prototype.parseArraysToObjects = function(x, fields, outnames, trans) {
    // This overrides the default to keep all fields in `x` (the response)
    // If <https://github.com/statgen/locuszoom/pull/102> gets accepted, it won't be necessary.

    //intended for an object of arrays
    //{"id":[1,2], "val":[5,10]}
    if (Object.keys(x).length === 0) {
        throw "The association source sent back no data for this region.";
    }
    var records = [];
    fields.forEach(function(f, i) {
          if (!(f in x)) {throw "field " + f + " not found in response for " + outnames[i];}
    });
    var x_keys = Object.keys(x);
    var N = x[x_keys[0]].length; // NOTE: this was [1] before, why?
    x_keys.forEach(function(key) {
        if (x[key].length !== N) {
            throw "the response column " + key + " had " + x[key].length.toString() +
                " elements but " + x_keys[0] + " had " + N.toString();
        }
    });
    var nonfield_keys = x_keys.filter(function(key) {
        return fields.indexOf(key) === -1;
    });
    for(var i = 0; i < N; i++) {
        var record = {};
        for(var j=0; j<fields.length; j++) {
            var val = x[fields[j]][i];
            if (trans && trans[j]) {
                val = trans[j](val);
            }
            record[outnames[j]] = val;
        }
        for(var j=0; j<nonfield_keys.length; j++) {
            record[nonfield_keys[j]] = x[nonfield_keys[j]][i];
        }
        records.push(record);
    }
    return records;
};


LocusZoom.Data.FG_LDDataSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, "FG_LDDataSourceLZ");

// https://rest.ensembl.org/info/variation/populations/homo_sapiens?content-type=application/json;filter=LD
// ld/:species/:id/:population_name
LocusZoom.Data.FG_LDDataSource.prototype.getURL = function(state, chain, fields) {

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
    var windowSize= 500
    var population="1000GENOMES:phase_3:FIN"
    return refvar ? this.url + refvar + "/" + population + "?window_size=" + windowSize : null

};

LocusZoom.Data.FG_LDDataSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    // if ld was not fetched, return the previous chain skipping this data source
    if (!resp) return chain
    
    var res = JSON.parse(resp)
    var lookup = {}
    for (var i = 0; i < res.length; i++) {
        lookup[ res[i].variation2 ] = res[i];
    }

    var ld_field = outnames[ fields.indexOf("state") ]
    var reffield = outnames[ fields.indexOf("isrefvar") ]

    for (var i = 0; i < chain.body.length; i++) {

        var d = lookup[chain.body[i].rsid ]

        var isref = chain.header.ldrefvar.rsid == chain.body[i].rsid? 1:0

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
    //return {header: chain.header, body: respData};

}

LocusZoom.Data.FG_LDDataSource.prototype.fetchRequest = function(state, chain, fields) {
    var url = this.getURL(state, chain, fields);
    var headers = {
        "Content-Type": "application/json"
    };

    return url ? LocusZoom.createCORSPromise("GET", url, {}, headers) : Q.defer()

};



LocusZoom.TransformationFunctions.set("percent", function(x) {
    if (x === 1) { return "100%"; }
    var x = (x*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

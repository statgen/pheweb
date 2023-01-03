import { createCORSPromise, Data } from "locuszoom";
// @ts-ignore
import { defer, when } from "q";

/* This is needed to override (locuszoom:1.0.0) assets/js/app/Data.js:666
 * for chromosome 23 as umich refers to this as 'X'.
 */
export const UMichGeneSource = Data.Source.extend(function(init: any) {
  this.parseInit(init);
}, "UMichGeneSourceLZ");

UMichGeneSource.prototype.getURL = function(state: { chr: string; start: string; end: string; }, chain: any, fields: any) {
  const analysis = chain.header.analysis || this.params.source || this.params.analysis;
  const chr = +state.chr == 23 ? 'X' : state.chr;
  const url = `${this.url}?filter=source in ${analysis} and chrom eq '${chr}' and start le ${state.end} and end ge ${state.start}`;
  return url;
};
UMichGeneSource.prototype.normalizeResponse = LocusZoom.Data.GeneSource.prototype.normalizeResponse
UMichGeneSource.prototype.extractFields = LocusZoom.Data.GeneSource.prototype.extractFields

export const GWASCatSource = Data.Source.extend(function(init: any) {
  this.parseInit(init);
}, "GWASCatSoureLZ");

GWASCatSource.prototype.getURL = function(state: { chr: string; start: string; end: string; }, chain: any, fields: any) {
  const chr = +state.chr == 23 ? 'X' : state.chr;
  return  `${this.url}results/?format=objects&filter=id in ${this.params.id} and chrom eq  ${chr} and pos ge ${state.start} and pos le ${state.end}`;
};

GWASCatSource.prototype.parseResponse = function(resp: string, chain: { header: Object }, fields: string[], outnames: string[], trans: ((v: any) => any)[]) {

  var res: { data: any[] } = { data: [] };
  try {
    res = JSON.parse(resp);
  } catch (e) {
    resp = resp.replace(/Infinity/g, "\"Inf\"");
    res = JSON.parse(resp);
  }

  if (res.data.length === 0) {
    // gotta have mock variant in correct format so LD search does not internal server error
    var dat = outnames.reduce(function(acc: any, curr: any, i: number) {
      acc[curr] = "0:0_a/t";
      return acc;
    }, {});
    return { header: chain.header, body: [dat] };
  } else {
    res.data.forEach(d => {
      d.id = d.variant;
    });
    return Data.Source.prototype.parseResponse.call(this, res, chain, fields, outnames, trans);
  }
};

export const ClinvarDataSource = Data.Source.extend(function(init) {
  this.parseInit(init);
}, "ClinvarDataSourceLZ");

ClinvarDataSource.prototype.getURL = function(state: any, chain: any, fields: any) {
  return this.url;
};

ClinvarDataSource.prototype.fetchRequest = function(state: any, chain: any, fields: any) {

  var url = this.getURL(state, chain, fields);
  const chr = state.chr == '23' ? 'X' : state.chr;
  const chrpos = this.params?.region?.genome_build === 37 ? "chrpos37" : "chrpos";
  var requrl = `${url}esearch.fcgi?db=clinvar&retmode=json&term=${chr}[chr]${state.start}:${state.end}[${chrpos}]%22clinsig%20pathogenic%22[Properties]&retmax=500`;
  return createCORSPromise("GET", requrl).then(function(resp: unknown) {

      var data = JSON.parse(resp as string);

      if (+data.esearchresult.count === 0) {
        var res = defer();
        res.resolve("{ \"noresults\":\"\",\"pos\":" + state.start + " }");
        return res.promise;
      }

      if (data.esearchresult.idlist != null) {
        const requrl = url + "esummary.fcgi?db=clinvar&retmode=json&id=" + data.esearchresult.idlist.join(",");
        return createCORSPromise("GET", requrl);
      } else {
        const resultFailed = defer();
        console.log("Failed to query clinvar" + JSON.stringify(data, null, 4));
        resultFailed.reject("Failed to query clinvar" + JSON.stringify(data, null, 4));
        return resultFailed;
      }
    }
  );
};

ClinvarDataSource.prototype.parseResponse = function(resp: string, chain, fields, outnames, trans) {

  if (resp === "") {
    // locuszoom does not show even axis titles if there are no data visible.
    // make a mock element with id-1 which is set to invisible in the layout
    var dat = fields.reduce(function(acc, curr, i) {
      acc[curr] = -1;
      return acc;
    }, {});
    return { header: chain.header, body: [dat] };
  }

  var data = JSON.parse(resp);

  if (data.noresults != null) {
    // locuszoom does not show even axis titles if there are no data visible.
    // make a mock element with id-1 which is set to invisible in the layout
    const dat = fields.reduce(function(acc, curr, i) {
      acc[curr] = -1;
      return acc;
    }, {});
    return { header: chain.header, body: [dat] };
  }

  if (data.result == null) {
    throw Error(`error while processing clinvar: ${data.esummaryresult}`);
  }
  var respData: { start: string; stop: string; ref: string; alt: string; chr: string; varName: string; clinical_sig: string; trait: any; y: number; id: string; "clinvar:id": string; }[] = [];
  Object.entries(data.result).filter(function(x) {
    return x[0] !== "uids";
  }).forEach(function(x: any) {

    const val: {
      variation_set: {
        variation_name: string,
        variation_loc: {
          assembly_name: string,
          start: string,
          stop: string,
          ref: string,
          alt: string
          chr: string
        }[]
      }[],
      clinical_significance: { description: string },
      trait_set: any,
      uid: string
    } = x[1];
    const loc = val.variation_set[0].variation_loc.filter(function(x) {
      return x.assembly_name === "GRCh38";
    })[0];
    if (loc !== null) {
      const start = loc.start;
      const stop = loc.stop;
      const ref = loc.ref;
      const alt = loc.alt;
      const chr = loc.chr;
      const varName = val.variation_set[0].variation_name;
      const clinical_sig = val.clinical_significance.description;
      const trait = val.trait_set.map(function(x) {
        return x.trait_name;
      }).join(":");
      const y = 5;
      const id = val.uid;
      const clinvar_id = chr + ":" + start + "_" + ref + "/" + alt;
      const object = {
        start,
        stop,
        ref,
        alt,
        chr,
        varName,
        clinical_sig,
        trait,
        y,
        id,
        "clinvar:id": clinvar_id
      };
      respData.push(object);
    }

  });

  return { header: chain.header, body: respData };
};


Data.GeneConstraintSource.prototype.fetchRequest = function(state, chain, fields) {
  var geneids: string[] = [];
  chain.body.forEach(function(gene: { gene_id: string }) {
    var gene_id = gene.gene_id;
    if (gene_id.indexOf(".")) {
      gene_id = gene_id.substr(0, gene_id.indexOf("."));
    }
    geneids.push(gene_id);
  });
  this.getURL(state, chain, fields);
  var body = "geneids=" + encodeURIComponent(JSON.stringify(geneids));
  var headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };
  return createCORSPromise("POST", this.url, body, headers);

};

Data.Source.prototype.getData = function(state, fields, outnames, trans) {

  if (this.preGetData) {
    var pre = this.preGetData(state, fields, outnames, trans);
    if (this.pre) {
      state = pre.state || state;
      fields = pre.fields || fields;
      outnames = pre.outnames || outnames;
      trans = pre.trans || trans;
    }
  }

  var self = this;
  return function(chain) {
    if (self.dependentSource && chain && chain.body && !chain.body.length) {
      // A "dependent" source should not attempt to fire a request if there is no data for it to act on.
      // Therefore, it should simply return the previous data chain.
      return when(chain);
    }

    self.getRequest(state, chain, fields);

    return self.getRequest(state, chain, fields).then(function(resp) {
      return self.parseResponse(resp, chain, fields, outnames, trans);
    });
  };
};


export const FG_LDDataSource = Data.Source.extend(function(init) {
  this.parseInit(init);
}, "FG_LDDataSourceLZ");

// https://rest.ensembl.org/info/variation/populations/homo_sapiens?content-type=application/json;filter=LD
// ld/:species/:id/:population_name
FG_LDDataSource.prototype.getURL = function(state, chain, fields) {

  var findExtremeValue = function(x, pval, sign) {
    pval = pval || "pvalue";
    sign = sign || 1;
    var extremeVal = sign * x[0][pval], extremeIdx = 0;
    for (var i = 1; i < x.length; i++) {
      if (x[i][pval] * sign > extremeVal) {
        extremeVal = x[i][pval] * sign;
        extremeIdx = i;
      }
    }
    return extremeIdx;
  };

  var extremeIdx = findExtremeValue(chain.body, this.params.pvalue_field, -1);
  var topvar = chain.body[extremeIdx];
  var refvar = topvar[this.params.var_id_field];
  var url;
  chain.header.ldrefvar = topvar;
  if (this.params.region.lz_conf.ld_service.toLowerCase() === "finngen") {
    var windowSize = Math.min(state.end - state.start + 10000, this.params.region.lz_conf.ld_max_window);
    url = `${this.url}?variant=${topvar["association:chr"]}:${topvar["association:position"]}:${topvar["association:ref"]}:${topvar["association:alt"]}&window=${windowSize}&panel=${this.params.region.ld_panel_version}`;

  } else {
    url = refvar ?
      `${this.url}${refvar}/${this.params.region.lz_conf.ld_ens_pop}?window_size=${this.params.region.lz_conf.ld_ens_window}`
      :
      `${this.url} lead variant has no rsid, could not get LD`;
  }
  return url;
};

FG_LDDataSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

  // if ld was not fetched, return the previous chain skipping this data source
  if (!resp) return chain;

  var res;
  if (this.params.region.lz_conf.ld_service.toLowerCase() === "finngen") {
    res = JSON.parse(resp)["ld"];
  } else {
    res = JSON.parse(resp);
  }
  var lookup = {};

  for (var resultIndex = 0; resultIndex < res.length; resultIndex++) {
    res[resultIndex].variation1 = res[resultIndex].variation1.replace(/^23:/, "X:");
    res[resultIndex].variation2 = res[resultIndex].variation2.replace(/^23:/, "X:");
    lookup[res[resultIndex].variation2] = res[resultIndex];
  }

  var ld_field = outnames[fields.indexOf("state")];
  var reffield = outnames[fields.indexOf("isrefvar")];

  for (var bodyIndex = 0; bodyIndex < chain.body.length; bodyIndex++) {
    var d, isref;

    if (this.params.region.lz_conf.ld_service.toLowerCase() === "finngen") {
      d = lookup[chain.body[bodyIndex][this.params.var_id_field].replace("_", ":").replace("/", ":").replace(/^23:/, "X:")];
      isref = chain.header.ldrefvar[this.params.var_id_field] === chain.body[bodyIndex][this.params.var_id_field] ? 1 : 0;
    } else {
      d = lookup[chain.body[bodyIndex][this.params.var_id_field]];
      isref = chain.header.ldrefvar[this.params.var_id_field] === chain.body[bodyIndex][this.params.var_id_field] ? 1 : 0;
    }

    if (d != null) {
      chain.body[bodyIndex][ld_field] = d.r2;
      chain.body[bodyIndex][reffield] = isref;
    }

    if (isref === 1) {
      chain.body[bodyIndex][ld_field] = 1;
      chain.body[bodyIndex][reffield] = isref;
    }
  }
  ;

  return { header: chain.header, body: chain.body };

};

FG_LDDataSource.prototype.fetchRequest = function(state, chain, fields) {
  var url = this.getURL(state, chain, fields);
  var headers = {
    "Content-Type": "application/json"
  };

  return url ? createCORSPromise("GET", url, {}, headers) : defer();

};

export const ConditionalSource = Data.Source.extend(function(init: { url: string, params: { trait_fields: string [] } }) {
  this.parseInit(init);
}, "ConditionalLZ");

ConditionalSource.prototype.preGetData = function(state: { [key: string]: (object | number) },
                                                  fields: string[],
                                                  outnames: string[],
                                                  trans: null[]) {
  var id_field = this.params.id_field || "id";
  [id_field, "position"].forEach(function(x) {
    if (fields.indexOf(x) === -1) {
      fields.unshift(x);
      outnames.unshift(x);
      trans.unshift(null);
    }
  });
  return { fields: fields, outnames: outnames, trans: trans };
};

interface ChainResponse {
  header: { analysis?: string },
  body: (string | object)[],
  discrete: object
}

type StateResponse = { [key: string]: (Object | number) };

ConditionalSource.prototype.getURL = function(state: { [key: string]: (object | number) },
                                              chain: ChainResponse,
                                              fields: string[]) {
  const analysis = state.analysis || chain.header.analysis || this.params.analysis || 3;
  return this.url + "results/?filter=analysis in " + analysis +
    " and chromosome in  '" + state.chr + "'" +
    " and position ge " + state.start +
    " and position le " + state.end;
};


ConditionalSource.prototype.parseResponse = function(resp: string, chain: ChainResponse, fields: string[], outnames: string[], trans: any) {

  this.params.allData = JSON.parse(resp);
  this.params.dataIndex = this.params.dataIndex || 0;
  this.params.fields = fields;
  this.params.outnames = outnames;
  this.params.trans = trans;
  var res = this.params.allData;
  var lookup = {};
  for (var i = 0; i < chain.body.length; i++) {
    // @ts-ignore
    lookup[chain.body[i]["id"]] = i;
  }
  for (var f = 0; f < this.params.trait_fields.length; f++) {
    var field = this.params.trait_fields[f];
    for (var r = 0; r < res.length; r++) {
      res[r].data[field] = [];
      for (var j = 0; j < res[r].data.id.length; j++) {
        // @ts-ignore
        const idx = lookup[res[r].data.id[j]];
        if (idx !== undefined) {
          // @ts-ignore
          res[r].data[field].push(chain.body[idx][field]);
        } else {
          res[r].data[field].push("n/a");
        }
      }
    }
    fields.push(field);
    outnames.push(field);
  }

  return Data.Source.prototype.parseResponse.call(this, this.params.allData[this.params.dataIndex], chain, fields, outnames, trans);
};


const FineMappingSource = Data.Source.extend(function(init: { data: string }) {
  this.parseInit(init);
}, "FineMappingLZ");

FineMappingSource.prototype.preGetData = ConditionalSource.prototype.preGetData;
FineMappingSource.prototype.getURL = ConditionalSource.prototype.getURL;
FineMappingSource.prototype.parseResponse = ConditionalSource.prototype.parseResponse;

const ColocalizationSource = Data.Source.extend(function(init) {
  this.parseInit(init);
}, "ColocalizationLZ");

ColocalizationSource.prototype.getURL = function(// @ts-ignore
  state: StateResponse,
  // @ts-ignore
  chain: ChainResponse,
  // @ts-ignore
  fields: string[]) {
  const that = this as { url: string };
  return that.url;
};

ColocalizationSource.prototype.parseResponse = function(resp: string,
                                                        chain: ChainResponse,
                                                        fields: string[],
                                                        outnames: string[],
                                                        trans: null[]) {
  const that = this as { params: { fields: string[], outnames: string [], trans: null[] } };
  that.params.fields = fields;
  that.params.outnames = outnames;
  that.params.trans = trans;

  return Data.Source.prototype.parseResponse.call(that, JSON.parse(resp), chain, fields, outnames, trans);
};

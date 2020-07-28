/* global LocusZoom */
'use strict';

function validateBuildSource(class_name, build, source) {
    // Build OR Source, not both
    if ((build && source) || !(build || source)) {
        throw new Error(class_name + ' must provide a parameter specifying either "build" or "source". It should not specify both.');
    }
    // If the build isn't recognized, our APIs can't transparently select a source to match
    if (build && ['GRCh37', 'GRCh38'].indexOf(build) === -1) {
        throw new Error(class_name + ' must specify a valid genome build number');
    }
}

/**
 * LocusZoom functionality used for data parsing and retrieval
 * @namespace
 * @public
 */
LocusZoom.Data = LocusZoom.Data ||  {};

/**
 * Create and coordinate an ensemble of (namespaced) data source instances
 * @public
 * @class
 */
LocusZoom.DataSources = function() {
    /** @member {Object.<string, LocusZoom.Data.Source>} */
    this.sources = {};
};

/** @deprecated */
LocusZoom.DataSources.prototype.addSource = function(ns, x) {
    console.warn('Warning: .addSource() is deprecated. Use .add() instead');
    return this.add(ns, x);
};

/**
 * Add a (namespaced) datasource to the plot
 * @public
 * @param {String} ns A namespace used for fields from this data source
 * @param {LocusZoom.Data.Source|Array|null} x An instantiated datasource, or an array of arguments that can be used to
 *   create a known datasource type.
 */
LocusZoom.DataSources.prototype.add = function(ns, x) {
    // FIXME: Some existing sites create sources with arbitrary names. This leads to subtle breakage
    //    of namespaced fields in layouts. To avoid breaking existing usages outright, issue a deprecation warning.
    if (ns.match(/[^A-Za-z0-9_]/)) {
        console.warn("Deprecation warning: source name '" + ns + "' should contain only alphanumeric characters or underscores. Use of other characters may break layouts, and will be disallowed in the future.");
    }
    return this.set(ns, x);
};

/** @protected */
LocusZoom.DataSources.prototype.set = function(ns, x) {
    if (Array.isArray(x)) {
        // If passed array of source name and options, make the source
        var dsobj = LocusZoom.KnownDataSources.create.apply(null, x);
        // Each datasource in the chain should be aware of its assigned namespace
        dsobj.source_id = ns;
        this.sources[ns] = dsobj;
    } else {
        // If passed the already-created source object
        if (x !== null) {
            x.source_id = ns;
            this.sources[ns] = x;
        } else {
            delete this.sources[ns];
        }
    }
    return this;
};

/** @deprecated */
LocusZoom.DataSources.prototype.getSource = function(ns) {
    console.warn('Warning: .getSource() is deprecated. Use .get() instead');
    return this.get(ns);
};

/**
 * Return the datasource associated with a given namespace
 * @public
 * @param {String} ns Namespace
 * @returns {LocusZoom.Data.Source}
 */
LocusZoom.DataSources.prototype.get = function(ns) {
    return this.sources[ns];
};

/** @deprecated */
LocusZoom.DataSources.prototype.removeSource = function(ns) {
    console.warn('Warning: .removeSource() is deprecated. Use .remove() instead');
    return this.remove(ns);
};

/**
 * Remove the datasource associated with a given namespace
 * @public
 * @param {String} ns Namespace
 */
LocusZoom.DataSources.prototype.remove = function(ns) {
    return this.set(ns, null);
};

/**
 * Populate a list of datasources specified as a JSON object
 * @public
 * @param {String|Object} x An object or JSON representation containing {ns: configArray} entries
 * @returns {LocusZoom.DataSources}
 */
LocusZoom.DataSources.prototype.fromJSON = function(x) {
    if (typeof x === 'string') {
        x = JSON.parse(x);
    }
    var ds = this;
    Object.keys(x).forEach(function(ns) {
        ds.set(ns, x[ns]);
    });
    return ds;
};

/**
 * Return the names of all currently recognized datasources
 * @public
 * @returns {Array}
 */
LocusZoom.DataSources.prototype.keys = function() {
    return Object.keys(this.sources);
};

/**
 * Datasources can be instantiated from a JSON object instead of code. This represents existing sources in that format.
 *   For example, this can be helpful when sharing plots, or to share settings with others when debugging
 * @public
 */
LocusZoom.DataSources.prototype.toJSON = function() {
    return this.sources;
};

/**
 * Represents an addressable unit of data from a namespaced datasource, subject to specified value transformations.
 *
 * When used by a data layer, fields will automatically be re-fetched from the appropriate data source whenever the
 *   state of a plot fetches, eg pan or zoom operations that would affect what data is displayed.
 *
 * @public
 * @class
 * @param {String} field A string representing the namespace of the datasource, the name of the desired field to fetch
 *   from that datasource, and arbitrarily many transformations to apply to the value. The namespace and
 *   transformation(s) are optional and information is delimited according to the general syntax
 *   `[namespace:]name[|transformation][|transformation]`. For example, `association:pvalue|neglog10`
 */
LocusZoom.Data.Field = function(field) {

    var parts = /^(?:([^:]+):)?([^:|]*)(\|.+)*$/.exec(field);
    /** @member {String} */
    this.full_name = field;
    /** @member {String} */
    this.namespace = parts[1] || null;
    /** @member {String} */
    this.name = parts[2] || null;
    /** @member {Array} */
    this.transformations = [];

    if (typeof parts[3] == 'string' && parts[3].length > 1) {
        this.transformations = parts[3].substring(1).split('|');
        this.transformations.forEach(function(transform, i) {
            this.transformations[i] = LocusZoom.TransformationFunctions.get(transform);
        }.bind(this));
    }

    this.applyTransformations = function(val) {
        this.transformations.forEach(function(transform) {
            val = transform(val);
        });
        return val;
    };

    /**
     * Resolve the field for a given data element.
     *   First look for a full match with transformations already applied by the data requester.
     *   Otherwise prefer a namespace match and fall back to just a name match, applying transformations on the fly.
     * @param {Object} data Returned data/fields into for this element
     * @param {Object} [extra] User-applied annotations for this point (info not provided by the server that we want
     *  to preserve across re-renders). Example usage: "should_show_label"
     * @returns {*}
     */
    this.resolve = function(data, extra) {
        if (typeof data[this.full_name] == 'undefined') { // Check for cached result
            var val = null;
            if (typeof (data[this.namespace + ':' + this.name]) != 'undefined') { // Fallback: value sans transforms
                val = data[this.namespace + ':' + this.name];
            } else if (typeof data[this.name] != 'undefined') { // Fallback: value present without namespace
                val = data[this.name];
            } else if (extra && typeof extra[this.full_name] != 'undefined') { // Fallback: check annotations
                val = extra[this.full_name];
            } // We should really warn if no value found, but many bad layouts exist and this could break compatibility
            data[this.full_name] = this.applyTransformations(val);
        }
        return data[this.full_name];
    };

};

/**
 * The Requester manages fetching of data across multiple data sources. It is used internally by LocusZoom data layers.
 *   It passes state information and ensures that data is formatted in the manner expected by the plot.
 *
 * It is also responsible for constructing a "chain" of dependent requests, by requesting each datasource
 *   sequentially in the order specified in the datalayer `fields` array. Data sources are only chained within a
 *   data layer, and only if that layer requests more than one kind of data source.
 * @param {LocusZoom.DataSources} sources An object of {ns: LocusZoom.Data.Source} instances
 * @class
 */
LocusZoom.Data.Requester = function(sources) {

    function split_requests(fields) {
        // Given a fields array, return an object specifying what datasource names the data layer should make requests
        //  to, and how to handle the returned data
        var requests = {};
        // Regular expression finds namespace:field|trans
        var re = /^(?:([^:]+):)?([^:|]*)(\|.+)*$/;
        fields.forEach(function(raw) {
            var parts = re.exec(raw);
            var ns = parts[1] || 'base';
            var field = parts[2];
            var trans = LocusZoom.TransformationFunctions.get(parts[3]);
            if (typeof requests[ns] == 'undefined') {
                requests[ns] = {outnames:[], fields:[], trans:[]};
            }
            requests[ns].outnames.push(raw);
            requests[ns].fields.push(field);
            requests[ns].trans.push(trans);
        });
        return requests;
    }

    /**
     * Fetch data, and create a chain that only connects two data sources if they depend on each other
     * @param {Object} state The current "state" of the plot, such as chromosome and start/end positions
     * @param {String[]} fields The list of data fields specified in the `layout` for a specific data layer
     * @returns {Promise}
     */
    this.getData = function(state, fields) {
        var requests = split_requests(fields);
        // Create an array of functions that, when called, will trigger the request to the specified datasource
        var request_handles = Object.keys(requests).map(function(key) {
            if (!sources.get(key)) {
                throw new Error('Datasource for namespace ' + key + ' not found');
            }
            return sources.get(key).getData(state, requests[key].fields,
                                            requests[key].outnames, requests[key].trans);
        });
        //assume the fields are requested in dependent order
        //TODO: better manage dependencies
        var ret = Promise.resolve({header:{}, body: [], discrete: {}});
        for(var i = 0; i < request_handles.length; i++) {
            // If a single datalayer uses multiple sources, perform the next request when the previous one completes
            ret = ret.then(request_handles[i]);
        }
        return ret;
    };
};

/**
 * Base class for LocusZoom data sources
 * This can be extended with .extend() to create custom data sources
 * @class
 * @public
 */
LocusZoom.Data.Source = function() {
    /**
     * Whether this source should enable caching
     * @member {Boolean}
     */
    this.enableCache = true;
    /**
     * Whether this data source type is dependent on previous requests- for example, the LD source cannot annotate
     *  association data if no data was found for that region.
     * @member {boolean}
     */
    this.dependentSource = false;
};

/**
 * A default constructor that can be used when creating new data sources
 * @param {String|Object} init Basic configuration- either a url, or a config object
 * @param {String} [init.url] The datasource URL
 * @param {String} [init.params] Initial config params for the datasource
 */
LocusZoom.Data.Source.prototype.parseInit = function(init) {
    if (typeof init === 'string') {
        /** @member {String} */
        this.url = init;
        /** @member {String} */
        this.params = {};
    } else {
        this.url = init.url;
        this.params = init.params || {};
    }
    if (!this.url) {
        throw new Error('Source not initialized with required URL');
    }

};

/**
 * A unique identifier that indicates whether cached data is valid for this request
 * @protected
 * @param state
 * @param chain
 * @param fields
 * @returns {String|undefined}
 */
LocusZoom.Data.Source.prototype.getCacheKey = function(state, chain, fields) {
    return this.getURL && this.getURL(state, chain, fields);
};

/**
 * Stub: build the URL for any requests made by this source.
 */
LocusZoom.Data.Source.prototype.getURL = function(state, chain, fields) { return this.url; };

/**
 * Perform a network request to fetch data for this source
 * @protected
 * @param {Object} state The state of the parent plot
 * @param chain
 * @param fields
 * @returns {Promise}
 */
LocusZoom.Data.Source.prototype.fetchRequest = function(state, chain, fields) {
    var url = this.getURL(state, chain, fields);
    return LocusZoom.createCORSPromise('GET', url);
};

/**
 * Gets the data for just this source, typically via a network request (caching where possible)
 * @protected
 */
LocusZoom.Data.Source.prototype.getRequest = function(state, chain, fields) {
    var req;
    var cacheKey = this.getCacheKey(state, chain, fields);
    if (this.enableCache && typeof(cacheKey) !== 'undefined' && cacheKey === this._cachedKey) {
        req = Promise.resolve(this._cachedResponse);  // Resolve to the value of the current promise
    } else {
        req = this.fetchRequest(state, chain, fields);
        if (this.enableCache) {
            this._cachedKey = cacheKey;
            this._cachedResponse = req;
        }
    }
    return req;
};

/**
 * Fetch the data from the specified data source, and apply transformations requested by an external consumer.
 * This is the public-facing datasource method that will most commonly be called by external code.
 *
 * @public
 * @param {Object} state The current "state" of the plot, such as chromosome and start/end positions
 * @param {String[]} fields Array of field names that the plot has requested from this data source. (without the "namespace" prefix)
 * @param {String[]} outnames  Array describing how the output data should refer to this field. This represents the
 *     originally requested field name, including the namespace. This must be an array with the same length as `fields`
 * @param {Function[]} trans The collection of transformation functions to be run on selected fields.
 *     This must be an array with the same length as `fields`
 * @returns {function} A callable operation that can be used as part of the data chain
 */
LocusZoom.Data.Source.prototype.getData = function(state, fields, outnames, trans) {
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
            return Promise.resolve(chain);
        }

        return self.getRequest(state, chain, fields).then(function(resp) {
            return self.parseResponse(resp, chain, fields, outnames, trans);
        });
    };
};

/**
 * Ensure the server response is in a canonical form, an array of one object per record. [ {field: oneval} ].
 * If the server response contains columns, reformats the response from {column1: [], column2: []} to the above.
 *
 * Does not apply namespacing, transformations, or field extraction.
 *
 * May be overridden by data sources that inherently return more complex payloads, or that exist to annotate other
 *  sources (eg, if the payload provides extra data rather than a series of records).
 *
 * @param {Object[]|Object} data The original parsed server response
 * @protected
 */
LocusZoom.Data.Source.prototype.normalizeResponse = function (data) {
    if (Array.isArray(data)) {
        // Already in the desired form
        return data;
    }

    // Otherwise, assume the server response is an object representing columns of data.
    // Each array should have the same length (verify), and a given array index corresponds to a single row.
    var keys = Object.keys(data);
    var N = data[keys[0]].length;
    var sameLength = keys.every(function(key) {
        var item = data[key];
        return item.length === N;
    });
    if (!sameLength) {
        throw new Error(this.constructor.SOURCE_NAME + ' expects a response in which all arrays of data are the same length');
    }

    // Go down the rows, and create an object for each record
    var records = [];
    var fields = Object.keys(data);
    for(var i = 0; i < N; i++) {
        var record = {};
        for(var j = 0; j < fields.length; j++) {
            record[fields[j]] = data[fields[j]][i];
        }
        records.push(record);
    }
    return records;
};

/** @deprecated */
LocusZoom.Data.Source.prototype.prepareData = function (records) {
    console.warn('Warning: .prepareData() is deprecated. Use .annotateData() instead');
    return this.annotateData(records);
};

/**
 * Hook to post-process the data returned by this source with new, additional behavior.
 *   (eg cleaning up API values or performing complex calculations on the returned data)
 *
 * @param {Object[]} records The parsed data from the source (eg standardized api response)
 * @param {Object} chain The data chain object. For example, chain.headers may provide useful annotation metadata
 * @returns {Object[]|Promise} The modified set of records
 */
LocusZoom.Data.Source.prototype.annotateData = function(records, chain) {
    // Default behavior: no transformations
    return records;
};

/**
 * Clean up the server records for use by datalayers: extract only certain fields, with the specified names.
 *   Apply per-field transformations as appropriate.
 *
 * This hook can be overridden, eg to create a source that always returns all records and ignores the "fields" array.
 *  This is particularly common for sources at the end of a chain- many "dependent" sources do not allow
 *  cherry-picking individual fields, in which case by **convention** the fields array specifies "last_source_name:all"
 *
 * @param {Object[]} data One record object per element
 * @param {String[]} fields The names of fields to extract (as named in the source data). Eg "afield"
 * @param {String[]} outnames How to represent the source fields in the output. Eg "namespace:afield|atransform"
 * @param {function[]} trans An array of transformation functions (if any). One function per data element, or null.
 * @protected
 */
LocusZoom.Data.Source.prototype.extractFields = function (data, fields, outnames, trans) {
    //intended for an array of objects
    //  [ {"id":1, "val":5}, {"id":2, "val":10}]
    // Since a number of sources exist that do not obey this format, we will provide a convenient pass-through
    if (!Array.isArray(data)) {
        return data;
    }

    if (!data.length) {
        // Sometimes there are regions that just don't have data- this should not trigger a missing field error message!
        return data;
    }

    var fieldFound = [];
    for (var k = 0; k < fields.length; k++) {
        fieldFound[k] = 0;
    }

    var records = data.map(function (item) {
        var output_record = {};
        for (var j = 0; j < fields.length; j++) {
            var val = item[fields[j]];
            if (typeof val != 'undefined') {
                fieldFound[j] = 1;
            }
            if (trans && trans[j]) {
                val = trans[j](val);
            }
            output_record[outnames[j]] = val;
        }
        return output_record;
    });
    fieldFound.forEach(function(v, i) {
        if (!v) {throw new Error('field ' + fields[i] + ' not found in response for ' + outnames[i]);}
    });
    return records;
};

/**
 * Combine records from this source with others in the chain to yield final chain body.
 *   Handles merging this data with other sources (if applicable).
 *
 * @param {Object[]} data The data That would be returned from this source alone
 * @param {Object} chain The data chain built up during previous requests
 * @param {String[]} fields
 * @param {String[]} outnames
 * @return {Promise|Object[]} The new chain body
 * @protected
 */
LocusZoom.Data.Source.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
    return data;
};

/**
 * Coordinates the work of parsing a response and returning records. This is broken into 4 steps, which may be
 *  overridden separately for fine-grained control. Each step can return either raw data or a promise.
 *
 * @public
 * @param {String|Object} resp The raw data associated with the response
 * @param {Object} chain The combined parsed response data from this and all other requests made in the chain
 * @param {String[]} fields Array of requested field names (as they would appear in the response payload)
 * @param {String[]} outnames  Array of field names as they will be represented in the data returned by this source,
 *  including the namespace. This must be an array with the same length as `fields`
 * @param {Function[]} trans The collection of transformation functions to be run on selected fields.
 *     This must be an array with the same length as `fields`
 * @returns {Promise|{header: ({}|*), discrete: {}, body: []}} A promise that resolves to an object containing
 *   request metadata (headers), the consolidated data for plotting (body), and the individual responses that would be
 *   returned by each source in the chain in isolation (discrete)
 */
LocusZoom.Data.Source.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {
    var source_id = this.source_id || this.constructor.SOURCE_NAME;
    if (!chain.discrete) {
        chain.discrete = {};
    }

    if (!resp) {
        // FIXME: Hack. Certain browser issues (such as mixed content warnings) are reported as a successful promise
        //  resolution, even though the request was aborted. This is difficult to reliably detect, and is most likely
        // to occur for annotation sources (such as from ExAC). If empty response is received, skip parsing and log.
        // FIXME: Throw an error after pending, eg https://github.com/konradjk/exac_browser/issues/345
        console.error("No usable response was returned for source: '" + source_id + "'. Parsing will be skipped.");
        return Promise.resolve(chain);
    }

    var json = typeof resp == 'string' ? JSON.parse(resp) : resp;

    var self = this;
    // Perform the 4 steps of parsing the payload and return a combined chain object
    return Promise.resolve(self.normalizeResponse(json.data || json))
        .then(function(standardized) {
            // Perform calculations on the data from just this source
            return Promise.resolve(self.annotateData(standardized, chain));
        }).then(function (data) {
            return Promise.resolve(self.extractFields(data, fields, outnames, trans));
        }).then(function (one_source_body) {
            // Store a copy of the data that would be returned by parsing this source in isolation (and taking the
            //   fields array into account). This is useful when we want to re-use the source output in many ways.
            chain.discrete[source_id] = one_source_body;
            return Promise.resolve(self.combineChainBody(one_source_body, chain, fields, outnames, trans));
        }).then(function (new_body) {
            return { header: chain.header || {}, discrete: chain.discrete, body: new_body };
        });
};

/** @deprecated */
LocusZoom.Data.Source.prototype.parseArraysToObjects = function(data, fields, outnames, trans) {
    console.warn('Warning: .parseArraysToObjects() is no longer used. A stub is provided for legacy use');
    var standard = this.normalizeResponse(data);
    return this.extractFields(standard, fields, outnames, trans);
};

/** @deprecated */
LocusZoom.Data.Source.prototype.parseObjectsToObjects = function(data, fields, outnames, trans) {
    console.warn('Warning: .parseObjectsToObjects() is deprecated. Use .extractFields() instead');
    return this.extractFields(data, fields, outnames, trans);
};

/** @deprecated */
LocusZoom.Data.Source.prototype.parseData = function(data, fields, outnames, trans) {
    console.warn('Warning: .parseData() is no longer used. A stub is provided for legacy use');
    var standard = this.normalizeResponse(data);
    return this.extractFields(standard, fields, outnames, trans);
};

/**
 * Method to define new custom datasources based on a provided constructor. (does not allow registering any additional methods)
 * @public
 * @param {Function} constructorFun Constructor function that is used to create the specified class
 * @param {String} [uniqueName] The name by which the class should be listed in `KnownDataSources`
 * @param {String|Function} [base=LocusZoomData.Source] The name or constructor of a base class to use
 * @returns {*|Function}
 */
LocusZoom.Data.Source.extend = function(constructorFun, uniqueName, base) {
    if (base) {
        if (Array.isArray(base)) {
            base = LocusZoom.KnownDataSources.create.apply(null, base);
        } else if (typeof base === 'string') {
            base = LocusZoom.KnownDataSources.get(base).prototype;
        } else if (typeof base === 'function') {
            base = base.prototype;
        }
    } else {
        base =  new LocusZoom.Data.Source();
    }
    constructorFun = constructorFun || function() {};
    constructorFun.prototype = base;
    constructorFun.prototype.constructor = constructorFun;
    if (uniqueName) {
        /** @member {String} LocusZoom.Data.Source.SOURCENAME */
        constructorFun.SOURCE_NAME = uniqueName;
        LocusZoom.KnownDataSources.add(constructorFun);
    }
    return constructorFun;
};

/**
 * Datasources can be instantiated from a JSON object instead of code. This represents an existing source in that data format.
 *   For example, this can be helpful when sharing plots, or to share settings with others when debugging
 *
 * Custom sources with their own parameters may need to re-implement this method
 *
 * @public
 * @returns {Object}
 */
LocusZoom.Data.Source.prototype.toJSON = function() {
    return [Object.getPrototypeOf(this).constructor.SOURCE_NAME,
        {url:this.url, params:this.params}];
};

/**
 * Data Source for Association Data, as fetched from the LocusZoom API server (or compatible)
 * @class
 * @public
 * @augments LocusZoom.Data.Source
 */
LocusZoom.Data.AssociationSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, 'AssociationLZ');

LocusZoom.Data.AssociationSource.prototype.preGetData = function(state, fields, outnames, trans) {
    var id_field = this.params.id_field || 'id';
    [id_field, 'position'].forEach(function(x) {
        if (fields.indexOf(x) === -1) {
            fields.unshift(x);
            outnames.unshift(x);
            trans.unshift(null);
        }
    });
    return {fields: fields, outnames:outnames, trans:trans};
};

LocusZoom.Data.AssociationSource.prototype.getURL = function(state, chain, fields) {
    var analysis = chain.header.analysis || this.params.source || this.params.analysis;  // Old usages called this param "analysis"
    if (typeof analysis == 'undefined') {
        throw new Error('Association source must specify an analysis ID to plot');
    }
    return this.url + 'results/?filter=analysis in ' + analysis  +
        " and chromosome in  '" + state.chr + "'" +
        ' and position ge ' + state.start +
        ' and position le ' + state.end;
};

LocusZoom.Data.AssociationSource.prototype.normalizeResponse = function (data) {
    // Some association sources do not sort their data in a predictable order, which makes it hard to reliably
    //  align with other sources (such as LD). For performance reasons, sorting is an opt-in argument.
    // TODO: Consider more fine grained sorting control in the future
    data = LocusZoom.Data.Source.prototype.normalizeResponse.call(this, data);
    if (this.params && this.params.sort && data.length && data[0]['position']) {
        data.sort(function (a, b) { return a['position'] - b['position']; });
    }
    return data;
};

/**
 * Data Source for LD Data, as fetched from the LocusZoom API server (or compatible)
 * This source is designed to connect its results to association data, and therefore depends on association data having
 *  been loaded by a previous request in the data chain.
 *
 *  This source is deprecated in favor of a new, standalone LD server. For new usages, see LDLZ2.
 *
 * @class
 * @deprecated
 * @public
 * @augments LocusZoom.Data.Source
 */
LocusZoom.Data.LDSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
    this.dependentSource = true;
}, 'LDLZ');

LocusZoom.Data.LDSource.prototype.preGetData = function(state, fields) {
    if (fields.length > 1) {
        if (fields.length !== 2 || fields.indexOf('isrefvar') === -1) {
            throw new Error('LD does not know how to get all fields: ' + fields.join(', '));
        }
    }
};

LocusZoom.Data.LDSource.prototype.findMergeFields = function(chain) {
    // Find the fields (as provided by a previous step in the chain, like an association source) that will be needed to
    //  combine LD data with existing information

    // Since LD information may be shared across multiple assoc sources with different namespaces,
    //   we use regex to find columns to join on, rather than requiring exact matches
    var exactMatch = function(arr) {return function() {
        var regexes = arguments;
        for(var i = 0; i < regexes.length; i++) {
            var regex = regexes[i];
            var m = arr.filter(function(x) {return x.match(regex);});
            if (m.length) {
                return m[0];
            }
        }
        return null;
    };};
    var dataFields = {
        id: this.params.id_field,
        position: this.params.position_field,
        pvalue: this.params.pvalue_field,
        _names_:null
    };
    if (chain && chain.body && chain.body.length > 0) {
        var names = Object.keys(chain.body[0]);
        var nameMatch = exactMatch(names);
        // Internally, fields are generally prefixed with the name of the source they come from.
        // If the user provides an id_field (like `variant`), it should work across data sources( `assoc1:variant`,
        //  assoc2:variant), but not match fragments of other field names (assoc1:variant_thing)
        // Note: these lookups hard-code a couple of common fields that will work based on known APIs in the wild
        var id_match = dataFields.id && nameMatch(new RegExp(dataFields.id + '\\b'));
        dataFields.id = id_match || nameMatch(/\bvariant\b/) || nameMatch(/\bid\b/);
        dataFields.position = dataFields.position || nameMatch(/\bposition\b/i, /\bpos\b/i);
        dataFields.pvalue = dataFields.pvalue || nameMatch(/\bpvalue\b/i, /\blog_pvalue\b/i);
        dataFields._names_ = names;
    }
    return dataFields;
};

LocusZoom.Data.LDSource.prototype.findRequestedFields = function(fields, outnames) {
    // Assumption: all usages of this source will only ever ask for "isrefvar" or "state". This maps to output names.
    var obj = {};
    for(var i = 0; i < fields.length; i++) {
        if(fields[i] === 'isrefvar') {
            obj.isrefvarin = fields[i];
            obj.isrefvarout = outnames && outnames[i];
        } else {
            obj.ldin = fields[i];
            obj.ldout = outnames && outnames[i];
        }
    }
    return obj;
};

LocusZoom.Data.LDSource.prototype.normalizeResponse = function (data) { return data; };


/**
 * Get the LD reference variant, which by default will be the most significant hit in the assoc results
 *   This will be used in making the original query to the LD server for pairwise LD information
 * @returns {*|string} The marker id (expected to be in `chr:pos_ref/alt` format) of the reference variant
 */
LocusZoom.Data.LDSource.prototype.getRefvar = function (state, chain, fields) {
    var findExtremeValue = function(records, pval_field) {
        // Finds the most significant hit (smallest pvalue, or largest -log10p). Will try to auto-detect the appropriate comparison.
        pval_field = pval_field || 'log_pvalue';  // The official LZ API returns log_pvalue
        var is_log = /log/.test(pval_field);
        var cmp;
        if (is_log) {
            cmp = function(a, b) { return a > b; };
        } else {
            cmp = function(a, b) { return a < b; };
        }
        var extremeVal = records[0][pval_field], extremeIdx = 0;
        for(var i = 1; i < records.length; i++) {
            if (cmp(records[i][pval_field], extremeVal)) {
                extremeVal = records[i][pval_field];
                extremeIdx = i;
            }
        }
        return extremeIdx;
    };

    var reqFields = this.findRequestedFields(fields);
    var refVar = reqFields.ldin;
    if (refVar === 'state') {
        refVar = state.ldrefvar || chain.header.ldrefvar || 'best';
    }
    if (refVar === 'best') {
        if (!chain.body) {
            throw new Error('No association data found to find best pvalue');
        }
        var keys = this.findMergeFields(chain);
        if (!keys.pvalue || !keys.id) {
            var columns = '';
            if (!keys.id) { columns += (columns.length ? ', ' : '') + 'id'; }
            if (!keys.pvalue) { columns += (columns.length ? ', ' : '') + 'pvalue'; }
            throw new Error('Unable to find necessary column(s) for merge: ' + columns + ' (available: ' + keys._names_ + ')');
        }
        refVar = chain.body[findExtremeValue(chain.body, keys.pvalue)][keys.id];
    }
    return refVar;
};

LocusZoom.Data.LDSource.prototype.getURL = function(state, chain, fields) {
    var refSource = state.ldrefsource || chain.header.ldrefsource || 1;
    var refVar = this.getRefvar(state, chain, fields);
    chain.header.ldrefvar = refVar;
    return this.url + 'results/?filter=reference eq ' + refSource +
        " and chromosome2 eq '" + state.chr + "'" +
        ' and position2 ge ' + state.start +
        ' and position2 le ' + state.end +
        " and variant1 eq '" + refVar + "'" +
        '&fields=chr,pos,rsquare';
};

LocusZoom.Data.LDSource.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
    var keys = this.findMergeFields(chain);
    var reqFields = this.findRequestedFields(fields, outnames);
    if (!keys.position) {
        throw new Error('Unable to find position field for merge: ' + keys._names_);
    }
    var leftJoin = function(left, right, lfield, rfield) {
        var i = 0, j = 0;
        while (i < left.length && j < right.position2.length) {
            if (left[i][keys.position] === right.position2[j]) {
                left[i][lfield] = right[rfield][j];
                i++;
                j++;
            } else if (left[i][keys.position] < right.position2[j]) {
                i++;
            } else {
                j++;
            }
        }
    };
    var tagRefVariant = function(data, refvar, idfield, outrefname, outldname) {
        for(var i = 0; i < data.length; i++) {
            if (data[i][idfield] && data[i][idfield] === refvar) {
                data[i][outrefname] = 1;
                data[i][outldname] = 1; // For label/filter purposes, implicitly mark the ref var as LD=1 to itself
            } else {
                data[i][outrefname] = 0;
            }
        }
    };

    // LD servers vary slightly. Some report corr as "rsquare", others as "correlation"
    var corrField = data.rsquare ? 'rsquare' : 'correlation';
    leftJoin(chain.body, data, reqFields.ldout, corrField);
    if(reqFields.isrefvarin && chain.header.ldrefvar) {
        tagRefVariant(chain.body, chain.header.ldrefvar, keys.id, reqFields.isrefvarout, reqFields.ldout);
    }
    return chain.body;
};

/**
 * Fetch LD directly from the standalone Portal LD server
 *
 * @class
 * @public
 * @augments LocusZoom.Data.LDSource
 */
LocusZoom.Data.LDSource2 = LocusZoom.KnownDataSources.extend('LDLZ', 'LDLZ2', {
    getURL: function(state, chain, fields) {
        // Accept the following params in this.params:
        // - method (r, rsquare, cov)
        // - source (aka panel)
        // - population (ALL, AFR, EUR, etc)
        // - build
        // The LD source/pop can be overridden from plot.state for dynamic layouts
        var build = state.genome_build || this.params.build || 'GRCh37';
        var source = state.ld_source || this.params.source || '1000G';
        var population = state.ld_pop || this.params.population || 'ALL';  // LDServer panels will always have an ALL
        var method = this.params.method || 'rsquare';

        validateBuildSource(this.constructor.SOURCE_NAME, build, null);  // LD doesn't need to validate `source` option

        var refVar = this.getRefvar(state, chain, fields);
        // Some datasets, notably the Portal, use a different marker format.
        //  Coerce it into one that will work with the LDServer API. (CHROM:POS_REF/ALT)
        var REGEX_MARKER = /^(?:chr)?([a-zA-Z0-9]+?):(\d+)[_:]?(\w+)?[/:|]?([^_]+)?_?(.*)?/;
        var match = refVar && refVar.match(REGEX_MARKER);

        if(!match) {
            throw new Error('Could not request LD for a missing or incomplete marker format');
        }
        refVar = [match[1], ':', match[2], '_', match[3], '/', match[4]].join('');
        chain.header.ldrefvar = refVar;

        return  [
            this.url, 'genome_builds/', build, '/references/', source, '/populations/', population, '/variants',
            '?correlation=', method,
            '&variant=', encodeURIComponent(refVar),
            '&chrom=', encodeURIComponent(state.chr),
            '&start=', encodeURIComponent(state.start),
            '&stop=', encodeURIComponent(state.end)
        ].join('');
    },
    fetchRequest: function(state, chain, fields) {
        // The API is paginated, but we need all of the data to render a plot. Depaginate and combine where appropriate.
        var url = this.getURL(state, chain, fields);
        var combined = { data: {} };
        var chainRequests = function (url) {
            return LocusZoom.createCORSPromise('GET', url)
                .then(function(payload) {
                    payload = JSON.parse(payload);
                    Object.keys(payload.data).forEach(function (key) {
                        combined.data[key] = (combined.data[key] || []).concat(payload.data[key]);
                    });
                    if (payload.next) {
                        return chainRequests(payload.next);
                    }
                    return combined;
                });
        };

        return chainRequests(url);
    }
});

/**
 * Data source for GWAS catalogs of known variants
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 * @param {Object|String} init Configuration (URL or object)
 * @param {Object} [init.params] Optional configuration parameters
 * @param {Number} [init.params.source=2] The ID of the chosen catalog. Defaults to EBI GWAS catalog, GRCh37
 * @param {('strict'|'loose')} [init.params.match_type='strict'] Whether to match on exact variant, or just position.
 */
LocusZoom.Data.GwasCatalog = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
    this.dependentSource = true;
}, 'GwasCatalogLZ');

LocusZoom.Data.GwasCatalog.prototype.getURL = function(state, chain, fields) {
    // This is intended to be aligned with another source- we will assume they are always ordered by position, asc
    //  (regardless of the actual match field)
    var build_option = state.genome_build || this.params.build;
    validateBuildSource(this.constructor.SOURCE_NAME, build_option, null); // Source can override build- not mutually exclusive

    // Most of our annotations will respect genome build before any other option.
    //   But there can be more than one GWAS catalog for the same build, so an explicit config option will always take
    //   precedence.
    var default_source = (build_option === 'GRCh38') ? 1 : 2;  // EBI GWAS catalog
    var source = this.params.source || default_source;
    return this.url + '?format=objects&sort=pos&filter=id eq ' + source +
        " and chrom eq '" + state.chr + "'" +
        ' and pos ge ' + state.start +
        ' and pos le ' + state.end;
};

LocusZoom.Data.GwasCatalog.prototype.findMergeFields = function (records) {
    // Data from previous sources is already namespaced. Find the alignment field by matching.
    var knownFields = Object.keys(records);
    // Note: All API endoints involved only give results for 1 chromosome at a time; match is implied
    var posMatch = knownFields.find(function (item) { return item.match(/\b(position|pos)\b/i); });

    if (!posMatch) {
        throw new Error('Could not find data to align with GWAS catalog results');
    }
    return { 'pos': posMatch };
};

// Skip the "individual field extraction" step; extraction will be handled when building chain body instead
LocusZoom.Data.GwasCatalog.prototype.extractFields = function (data, fields, outnames, trans) { return data; };

LocusZoom.Data.GwasCatalog.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
    if (!data.length) {
        return chain.body;
    }

    var decider = 'log_pvalue'; //  TODO: Better reuse options in the future
    var decider_out = outnames[fields.indexOf(decider)];

    function leftJoin(left, right, fields, outnames, trans) { // Add `fields` from `right` to `left`
        // Add a synthetic, un-namespaced field to all matching records
        var n_matches = left['n_catalog_matches'] || 0;
        left['n_catalog_matches'] = n_matches + 1;
        if (decider && left[decider_out] && left[decider_out] > right[decider]) {
            // There may be more than one GWAS catalog entry for the same SNP. This source is intended for a 1:1
            //  annotation scenario, so for now it only joins the catalog entry that has the best -log10 pvalue
            return;
        }

        for (var j = 0; j < fields.length; j++) {
            var fn = fields[j];
            var outn = outnames[j];

            var val = right[fn];
            if (trans && trans[j]) {
                val = trans[j](val);
            }
            left[outn] = val;
        }
    }

    var chainNames = this.findMergeFields(chain.body[0]);
    var catNames = this.findMergeFields(data[0]);

    var i = 0, j = 0;
    while (i < chain.body.length && j < data.length) {
        var left = chain.body[i];
        var right = data[j];

        if (left[chainNames.pos] === right[catNames.pos]) {
            // There may be multiple catalog entries for each matching SNP; evaluate match one at a time
            leftJoin(left, right, fields, outnames, trans);
            j += 1;
        } else if (left[chainNames.pos] < right[catNames.pos]) {
            i += 1;
        } else {
            j += 1;
        }
    }
    return chain.body;
};


/**
 * Data Source for Gene Data, as fetched from the LocusZoom API server (or compatible)
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
LocusZoom.Data.GeneSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, 'GeneLZ');

LocusZoom.Data.GeneSource.prototype.getURL = function(state, chain, fields) {
    var build = state.genome_build || this.params.build;
    var source = this.params.source;
    validateBuildSource(this.constructor.SOURCE_NAME, build, source);

    if (build) { // If build specified, choose a known Portal API dataset IDs (build 37/38)
        source = (build === 'GRCh38') ? 1 : 3;
    }
    return this.url + '?filter=source in ' + source +
        " and chrom eq '" + state.chr + "'" +
        ' and start le ' + state.end +
        ' and end ge ' + state.start;
};

// Genes have a very complex internal data format. Bypass any record parsing, and provide the data layer with the
// exact information returned by the API. (ignoring the fields array in the layout)
LocusZoom.Data.GeneSource.prototype.normalizeResponse = function (data) { return data; };
LocusZoom.Data.GeneSource.prototype.extractFields = function (data, fields, outnames, trans) { return data; };

/**
 * Data Source for Gene Constraint Data, as fetched from the gnomAD server (or compatible)
 *
 * In the past, this source used ExAC, which has been completely decommissioned. Since the old source referenced a
 *  server that no longer exists, this was redefined in 0.11.0 in a backwards-incompatible manner.
 *
 * @public
 * @class
 * @augments LocusZoom.Data.Source
*/
LocusZoom.Data.GeneConstraintSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, 'GeneConstraintLZ');

LocusZoom.Data.GeneConstraintSource.prototype.getURL = function() {
    return this.url;
};

LocusZoom.Data.GeneConstraintSource.prototype.normalizeResponse = function (data) { return data; };

LocusZoom.Data.GeneConstraintSource.prototype.getCacheKey = function(state, chain, fields) {
    var build = state.genome_build || this.params.build;
    // Gather the state params that govern constraint query for a given region.
    var query_for = [state.chr, state.start, state.end, build].join(' ');
    return this.url + query_for;
};

LocusZoom.Data.GeneConstraintSource.prototype.fetchRequest = function(state, chain, fields) {
    var build = state.genome_build || this.params.build;
    if (!build) {
        throw new Error(['Data source', this.constructor.SOURCE_NAME, 'requires that you specify a genome_build'].join(' '));
    }

    var unique_gene_names = chain.body.reduce(
        // In rare cases, the same gene symbol may appear at multiple positions. (issue #179) We de-duplicate the
        //  gene names to avoid issuing a malformed GraphQL query.
        function (acc, gene) {
            acc[gene.gene_name] = null;
            return acc;
        },
        {}
    );
    var query = Object.keys(unique_gene_names).map(function (gene_name) {
        // GraphQL alias names must match a specific set of allowed characters: https://stackoverflow.com/a/45757065/1422268
        var alias = '_' + gene_name.replace(/[^A-Za-z0-9_]/g, '_');
        // Each gene symbol is a separate graphQL query, grouped into one request using aliases
        return alias + ': gene(gene_symbol: "' + gene_name + '", reference_genome: ' + build + ') { gnomad_constraint { exp_syn obs_syn syn_z oe_syn oe_syn_lower oe_syn_upper exp_mis obs_mis mis_z oe_mis oe_mis_lower oe_mis_upper exp_lof obs_lof pLI oe_lof oe_lof_lower oe_lof_upper } } ';
    });

    if (!query.length) {
        // If there are no genes, skip the network request
        return Promise.resolve({ data: null });
    }

    query = '{' + query.join(' ') + ' }'; // GraphQL isn't quite JSON; items are separated by spaces but not commas
    var url = this.getURL(state, chain, fields);
    // See: https://graphql.org/learn/serving-over-http/
    var body = JSON.stringify({ query: query });
    var headers = { 'Content-Type': 'application/json' };
    return LocusZoom.createCORSPromise('POST', url, body, headers);
};

LocusZoom.Data.GeneConstraintSource.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
    if (!data) {
        return chain;
    }

    chain.body.forEach(function(gene) {
        // Find payload keys that match gene names in this response
        var alias = '_' + gene.gene_name.replace(/[^A-Za-z0-9_]/g, '_');  // aliases are modified gene names
        var constraint = data[alias] && data[alias]['gnomad_constraint']; // gnomad API has two ways of specifying missing data for a requested gene
        if (constraint) {
            // Add all fields from constraint data- do not override fields present in the gene source
            Object.keys(constraint).forEach(function (key) {
                var val = constraint[key];
                if (typeof gene[key] === 'undefined') {
                    if (typeof val == 'number' && val.toString().indexOf('.') !== -1) {
                        val = parseFloat(val.toFixed(2));
                    }
                    gene[key] = val;   // These two sources are both designed to bypass namespacing
                }
            });
        }
    });
    return chain.body;
};

/**
 * Data Source for Recombination Rate Data, as fetched from the LocusZoom API server (or compatible)
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
LocusZoom.Data.RecombinationRateSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, 'RecombLZ');

LocusZoom.Data.RecombinationRateSource.prototype.getURL = function(state, chain, fields) {
    var build = state.genome_build || this.params.build;
    var source = this.params.source;
    validateBuildSource(this.constructor.SOURCE_NAME, build, source);

    if (build) { // If build specified, choose a known Portal API dataset IDs (build 37/38)
        source = (build === 'GRCh38') ? 16 : 15;
    }
    return this.url + '?filter=id in ' + source +
        " and chromosome eq '" + state.chr + "'" +
        ' and position le ' + state.end +
        ' and position ge ' + state.start;
};

/**
 * Data Source for static blobs of JSON Data. This does not perform additional parsing, and therefore it is the
 * responsibility of the user to pass information in a format that can be read and understood by the chosen plot.
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
LocusZoom.Data.StaticSource = LocusZoom.Data.Source.extend(function(data) {
    /** @member {Object} */
    this._data = data;
},'StaticJSON');

LocusZoom.Data.StaticSource.prototype.getRequest = function(state, chain, fields) {
    return Promise.resolve(this._data);
};

LocusZoom.Data.StaticSource.prototype.toJSON = function() {
    return [Object.getPrototypeOf(this).constructor.SOURCE_NAME, this._data];
};

/**
 * Data source for PheWAS data
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 * @param {String[]} init.params.build This datasource expects to be provided the name of the genome build that will
 *   be used to provide pheWAS results for this position. Note positions may not translate between builds.
 */
LocusZoom.Data.PheWASSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, 'PheWASLZ');
LocusZoom.Data.PheWASSource.prototype.getURL = function(state, chain, fields) {
    var build = (state.genome_build ? [state.genome_build] : null) || this.params.build;
    if (!build || !Array.isArray(build) || !build.length) {
        throw new Error(['Data source', this.constructor.SOURCE_NAME, 'requires that you specify array of one or more desired genome build names'].join(' '));
    }
    var url = [
        this.url,
        "?filter=variant eq '", encodeURIComponent(state.variant), "'&format=objects&",
        build.map(function(item) {return 'build=' + encodeURIComponent(item);}).join('&')
    ];
    return url.join('');
};

/**
 * Base class for "connectors"- this is meant to be subclassed, rather than used directly.
 *
 * A connector is a source that makes no server requests and caches no data of its own. Instead, it decides how to
 *  combine data from other sources in the chain. Connectors are useful when we want to request (or calculate) some
 *  useful piece of information once, but apply it to many different kinds of record types.
 *
 * Typically, a subclass will implement the field merging logic in `combineChainBody`.
 *
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 * @param {Object} init Configuration for this source
 * @param {Object} init.sources Specify how the hard-coded logic should find the data it relies on in the chain,
 *  as {internal_name: chain_source_id} pairs. This allows writing a reusable connector that does not need to make
 *  assumptions about what namespaces a source is using.
 * @type {*|Function}
 */
LocusZoom.Data.ConnectorSource = LocusZoom.Data.Source.extend(function(init) {
    if (!init || !init.sources) {
        throw new Error('Connectors must specify the data they require as init.sources = {internal_name: chain_source_id}} pairs');
    }

    /**
     * Tells the connector how to find the data it relies on
     *
     * For example, a connector that applies burden test information to the genes layer might specify:
     *  {gene_ns: "gene", aggregation_ns: "aggregation"}
     *
     * @member {Object}
     */
    this._source_name_mapping = init.sources;

    // Validate that this source has been told how to find the required information
    var specified_ids = Object.keys(init.sources);
    var self = this;
    this.REQUIRED_SOURCES.forEach(function (k) {
        if (specified_ids.indexOf(k) === -1) {
            throw new Error('Configuration for ' + self.constructor.SOURCE_NAME + ' must specify a source ID corresponding to ' + k);
        }
    });
    this.parseInit(init);
}, 'ConnectorSource');

/** @property {String[]} Specifies the sources that must be provided in the original config object */
LocusZoom.Data.ConnectorSource.prototype.REQUIRED_SOURCES = [];

LocusZoom.Data.ConnectorSource.prototype.parseInit = function(init) {};  // Stub

LocusZoom.Data.ConnectorSource.prototype.getRequest = function(state, chain, fields) {
    // Connectors do not request their own data by definition, but they *do* depend on other sources having been loaded
    //  first. This method performs basic validation, and preserves the accumulated body from the chain so far.
    var self = this;
    Object.keys(this._source_name_mapping).forEach(function(ns) {
        var chain_source_id = self._source_name_mapping[ns];
        if (chain.discrete && !chain.discrete[chain_source_id]) {
            throw new Error(self.constructor.SOURCE_NAME + ' cannot be used before loading required data for: ' + chain_source_id);
        }
    });
    return Promise.resolve(chain.body || []);
};

LocusZoom.Data.ConnectorSource.prototype.parseResponse = function(data, chain, fields, outnames, trans) {
    // A connector source does not update chain.discrete, but it may use it. It bypasses data formatting
    //  and field selection (both are assumed to have been done already, by the previous sources this draws from)

    // Because of how the chain works, connectors are not very good at applying new transformations or namespacing.
    // Typically connectors are called with `connector_name:all` in the fields array.
    return Promise.resolve(this.combineChainBody(data, chain, fields, outnames, trans))
        .then(function(new_body) {
            return {header: chain.header || {}, discrete: chain.discrete || {}, body: new_body};
        });
};

LocusZoom.Data.ConnectorSource.prototype.combineChainBody = function(records, chain) {
    // Stub method: specifies how to combine the data
    throw new Error('This method must be implemented in a subclass');
};

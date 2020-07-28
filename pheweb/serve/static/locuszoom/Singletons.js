/* global LocusZoom */
'use strict';

/**
 *
 * LocusZoom has various singleton objects that are used for registering functions or classes.
 * These objects provide safe, standard methods to redefine or delete existing functions/classes
 * as well as define new custom functions/classes to be used in a plot.
 *
 * @namespace Singletons
 */


/*
 * The Collection of "Known" Data Sources. This registry is used internally by the `DataSources` class
 * @class
 * @static
 */
LocusZoom.KnownDataSources = (function() {
    /** @lends LocusZoom.KnownDataSources */
    var obj = {};
    /* @member {function[]} */
    var sources = [];

    var findSourceByName = function(x) {
        for(var i = 0; i < sources.length; i++) {
            if (!sources[i].SOURCE_NAME) {
                throw new Error('KnownDataSources at position ' + i + " does not have a 'SOURCE_NAME' static property");
            }
            if (sources[i].SOURCE_NAME === x) {
                return sources[i];
            }
        }
        return null;
    };

    /**
     * Identify the datasource associated with a given name
     * @param {String} name
     * @returns {function} The constructor for the data source; will usually extend `Data.Source`
     */
    obj.get = function(name) {
        return findSourceByName(name);
    };

    /**
     * Register a data source constructor so that it may be located by name
     * @param {function} source A constructor function for a data source; will usually extend `Data.Source`,
     *   and should have a `SOURCE_NAME` property
     */
    obj.add = function(source) {
        if (!source.SOURCE_NAME) {
            console.warn('Data source added does not have a SOURCE_NAME');
        }
        sources.push(source);
    };

    /**
     * Create a custom source type that extends the behavior of an existing source, and registers that
     *  source by the provided name
     * @param {String} parent_name The name of a previously registered data source type to use as a template
     * @param {String} source_name The new name to use when registering this data source
     * @param {Object} overrides An object of additional properties and methods to add/override behavior
     * @returns {LocusZoom.Data.Source} The newly defined class for this source
     */
    obj.extend = function(parent_name, source_name, overrides) {
        var parent = findSourceByName(parent_name);
        if (!parent) {
            throw new Error('Attempted to subclass an unknown or unregistered data source');
        }
        if (!source_name) {
            throw new Error('Must provide a name for the new data source');
        }
        if (typeof overrides !== 'object') {
            throw new Error('Must specify an object of properties and methods');
        }
        var child = LocusZoom.subclass(parent, overrides);
        child.SOURCE_NAME = source_name;
        sources.push(child);
        return child;
    };

    /** @deprecated */
    obj.push = function(source) {
        console.warn('Warning: KnownDataSources.push() is deprecated. Use .add() instead');
        obj.add(source);
    };

    /**
     * List the names of all registered datasources
     * @returns {String[]}
     */
    obj.list = function() {
        return sources.map(function(x) {return x.SOURCE_NAME;});
    };

    /**
     * Create a datasource instance
     * @param {String} name The name of the desired datasource to instantiate (must be defined in the registry)
     * @returns {LocusZoom.Data.Source}
     */
    obj.create = function(name) {
        //create new object (pass additional parameters to constructor)
        var newObj = findSourceByName(name);
        if (newObj) {
            var params = arguments;
            params[0] = null;
            return new (Function.prototype.bind.apply(newObj, params));
        } else {
            throw new Error('Unable to find data source for name: ' + name);
        }
    };

    /**
     * Get the array of all registered constructors
     *   Generally only used for unit tests internally
     * @private
     * @returns {function[]}
     */
    obj.getAll = function() {
        return sources;
    };

    /**
     * Register an entire collection of data sources
     *   Generally only used for unit tests internally
     * @private
     * @param {function[]} x An array of datasource constructors
     */
    obj.setAll = function(x) {
        sources = x;
    };

    /**
     * Unregister all known data sources
     *   Generally only used for unit tests internally
     * @private
     */
    obj.clear = function() {
        sources = [];
    };

    return obj;
})();

/**************************
 * Transformation Functions
 *
 * Singleton for formatting or transforming a single input, for instance turning raw p values into negative log10 form
 * Transformation functions are chainable with a pipe on a field name, like so: "pvalue|neglog10"
 *
 * NOTE: Because these functions are chainable the FUNCTION is returned by get(), not the result of that function.
 *
 * All transformation functions must accept an object of parameters and a value to process.
 * @class
 */
LocusZoom.TransformationFunctions = (function() {
    /** @lends LocusZoom.TransformationFunctions */
    var obj = {};
    var transformations = {};

    var getTrans = function(name) {
        if (!name) {
            return null;
        }
        var fun = transformations[name];
        if (fun)  {
            return fun;
        } else {
            throw new Error('transformation ' + name + ' not found');
        }
    };

    //a single transformation with any parameters
    //(parameters not currently supported)
    var parseTrans = function(name) {
        return getTrans(name);
    };

    //a "raw" transformation string with a leading pipe
    //and one or more transformations
    var parseTransString = function(x) {
        var funs = [];
        var re = /\|([^|]+)/g;
        var result;
        while((result = re.exec(x)) !== null) {
            funs.push(result[1]);
        }
        if (funs.length === 1) {
            return parseTrans(funs[0]);
        } else if (funs.length > 1) {
            return function(x) {
                var val = x;
                for(var i = 0; i < funs.length; i++) {
                    val = parseTrans(funs[i])(val);
                }
                return val;
            };
        }
        return null;
    };

    /**
     * Retrieve a transformation function by name
     * @param {String} name The name of the transformation function to retrieve. May optionally be prefixed with a
     *   pipe (`|`) when chaining multiple transformation functions.
     * @returns {function} The constructor for the transformation function
     */
    obj.get = function(name) {
        if (name && name.substring(0,1) === '|') {
            return parseTransString(name);
        } else {
            return parseTrans(name);
        }
    };
    /**
     * Internal logic that registers a transformation function
     * @protected
     * @param {String} name
     * @param {function} fn
     */
    obj.set = function(name, fn) {
        if (name.substring(0,1) === '|') {
            throw new Error('transformation name should not start with a pipe');
        } else {
            if (fn) {
                transformations[name] = fn;
            } else {
                delete transformations[name];
            }
        }
    };

    /**
     * Register a transformation function
     * @param {String} name
     * @param {function} fn A transformation function (should accept one argument with the value)
     */
    obj.add = function(name, fn) {
        if (transformations[name]) {
            throw new Error('transformation already exists with name: ' + name);
        } else {
            obj.set(name, fn);
        }
    };
    /**
     * List the names of all registered transformation functions
     * @returns {String[]}
     */
    obj.list = function() {
        return Object.keys(transformations);
    };

    return obj;
})();

/**
 * Return the -log (base 10)
 * @function neglog10
 */
LocusZoom.TransformationFunctions.add('neglog10', function(x) {
    if (isNaN(x) || x <= 0) { return null; }
    return -Math.log(x) / Math.LN10;
});

/**
 * Convert a number from logarithm to scientific notation. Useful for, eg, a datasource that returns -log(p) by default
 * @function logtoscinotation
 */
LocusZoom.TransformationFunctions.add('logtoscinotation', function(x) {
    if (isNaN(x)) { return 'NaN'; }
    if (x === 0) { return '1'; }
    var exp = Math.ceil(x);
    var diff = exp - x;
    var base = Math.pow(10, diff);
    if (exp === 1) {
        return (base / 10).toFixed(4);
    } else if (exp === 2) {
        return (base / 100).toFixed(3);
    } else {
        return base.toFixed(2) + ' × 10^-' + exp;
    }
});

/**
 * Represent a number in scientific notation
 * @function scinotation
 * @param {Number} x
 * @returns {String}
 */
LocusZoom.TransformationFunctions.add('scinotation', function(x) {
    if (isNaN(x)) { return 'NaN'; }
    if (x === 0) { return '0'; }

    var abs = Math.abs(x);
    var log;
    if (abs > 1) {
        log = Math.ceil(Math.log(abs) / Math.LN10);
    } else {  // 0...1
        log = Math.floor(Math.log(abs) / Math.LN10);
    }
    if (Math.abs(log) <= 3) {
        return x.toFixed(3);
    } else {
        return x.toExponential(2).replace('+', '').replace('e', ' × 10^');
    }
});

/**
 * URL-encode the provided text, eg for constructing hyperlinks
 * @function urlencode
 * @param {String} str
 */
LocusZoom.TransformationFunctions.add('urlencode', function(str) {
    return encodeURIComponent(str);
});

/**
 * HTML-escape user entered values for use in constructed HTML fragments
 *
 * For example, this filter can be used on tooltips with custom HTML display
 * @function htmlescape
 * @param {String} str HTML-escape the provided value
 */
LocusZoom.TransformationFunctions.add('htmlescape', function(str) {
    if ( !str ) {
        return '';
    }
    str = str + '';

    return str.replace( /['"<>&`]/g, function( s ) {
        switch ( s ) {
        case "'":
            return '&#039;';
        case '"':
            return '&quot;';
        case '<':
            return '&lt;';
        case '>':
            return '&gt;';
        case '&':
            return '&amp;';
        case '`':
            return '&#x60;';
        }
    });
});

/**
 * Singleton for accessing/storing functions that will convert arbitrary data points to values in a given scale
 * Useful for anything that needs to scale discretely with data (e.g. color, point size, etc.)
 *
 * A Scale Function can be thought of as a modifier to a layout directive that adds extra logic to how a piece of data
 *   can be resolved to a value.
 *
 * All scale functions must accept an object of parameters and a value to process.
 * @class
 * @static
 */
LocusZoom.ScaleFunctions = (function() {
    /** @lends LocusZoom.ScaleFunctions */
    var obj = {};
    var functions = {};

    /**
     * Find a scale function and return it. If parameters and values are passed, calls the function directly; otherwise
     *   returns a callable.
     * @param {String} name
     * @param {Object} [parameters] Configuration parameters specific to the specified scale function
     * @param {*} [value] The value to operate on
     * @param {*} [value] The value to operate on
     * @returns {Number} [index] The position of this element in the parent data array
     */
    obj.get = function(name, parameters, value, index) {
        if (!name) {
            return null;
        } else if (functions[name]) {
            if (typeof parameters === 'undefined' && typeof value === 'undefined' && typeof index === 'undefined') {
                return functions[name];
            } else {
                return functions[name](parameters, value, index);
            }
        } else {
            throw new Error('scale function [' + name + '] not found');
        }
    };

    /**
     * @protected
     * @param {String} name The name of the function to set/unset
     * @param {Function} [fn] The function to register. If blank, removes this function name from the registry.
     */
    obj.set = function(name, fn) {
        if (fn) {
            functions[name] = fn;
        } else {
            delete functions[name];
        }
    };

    /**
     * Add a new scale function to the registry
     * @param {String} name The name of the scale function
     * @param {function} fn A scale function that accepts two parameters: an object of configuration and a value
     */
    obj.add = function(name, fn) {
        if (functions[name]) {
            throw new Error('scale function already exists with name: ' + name);
        } else {
            obj.set(name, fn);
        }
    };

    /**
     * List the names of all registered scale functions
     * @returns {String[]}
     */
    obj.list = function() {
        return Object.keys(functions);
    };

    return obj;
})();

/**
 * Basic conditional function to evaluate the value of the input field and return based on equality.
 * @param {Object} parameters
 * @param {*} parameters.field_value The value against which to test the input value.
 * @param {*} parameters.then The value to return if the input value matches the field value
 * @param {*} parameters.else  The value to return if the input value does not match the field value. Optional. If not
 *   defined this scale function will return null (or value of null_value parameter, if defined) when input value fails
 *   to match field_value.
 * @param {*} input value
 */
LocusZoom.ScaleFunctions.add('if', function(parameters, input) {
    if (typeof input == 'undefined' || parameters.field_value !== input) {
        if (typeof parameters.else != 'undefined') {
            return parameters.else;
        } else {
            return null;
        }
    } else {
        return parameters.then;
    }
});

/**
 * Function to sort numerical values into bins based on numerical break points. Will only operate on numbers and
 *   return null (or value of null_value parameter, if defined) if provided a non-numeric input value. Parameters:
 * @function numerical_bin
 * @param {Object} parameters
 * @param {Number[]} parameters.breaks  Array of numerical break points against which to evaluate the input value.
 *   Must be of equal length to values parameter. If the input value is greater than or equal to break n and less than
 *   or equal to break n+1 (or break n+1 doesn't exist) then returned value is the nth entry in the values parameter.
 * @param {Array} parameters.values  Array of values to return given evaluations against break points. Must be of
 *   equal length to breaks parameter. Each entry n represents the value to return if the input value is greater than
 *   or equal to break n and less than or equal to break n+1 (or break n+1 doesn't exist).
 * @param {*} null_value
 * @param {*} input value
 * @returns
 */
LocusZoom.ScaleFunctions.add('numerical_bin', function(parameters, input) {
    var breaks = parameters.breaks || [];
    var values = parameters.values || [];
    if (typeof input == 'undefined' || input === null || isNaN(+input)) {
        return (parameters.null_value ? parameters.null_value : null);
    }
    var threshold = breaks.reduce(function(prev, curr) {
        if (+input < prev || (+input >= prev && +input < curr)) {
            return prev;
        } else {
            return curr;
        }
    });
    return values[breaks.indexOf(threshold)];
});

/**
 * Function to sort values of any type into bins based on direct equality testing with a list of categories.
 *   Will return null if provided an input value that does not match to a listed category.
 * @function categorical_bin
 * @param {Object} parameters
 * @param {Array} parameters.categories  Array of values against which to evaluate the input value. Must be of equal
 *   length to values parameter. If the input value is equal to category n then returned value is the nth entry in the
 *   values parameter.
 * @param {Array} parameters.values  Array of values to return given evaluations against categories. Must be of equal
 *   length to categories parameter. Each entry n represents the value to return if the input value is equal to the nth
 *   value in the categories parameter.
 * @param {*} parameters.null_value  Value to return if the input value fails to match to any categories. Optional.
 */
LocusZoom.ScaleFunctions.add('categorical_bin', function(parameters, value) {
    if (typeof value == 'undefined' || parameters.categories.indexOf(value) === -1) {
        return (parameters.null_value ? parameters.null_value : null);
    } else {
        return parameters.values[parameters.categories.indexOf(value)];
    }
});

/**
 * Cycle through a set of options, so that the each element in a set of data receives a value different than the
 *  element before it. For example: "use this palette of 10 colors to visually distinguish 100 adjacent items"
 *  @param {Object} parameters
 *  @param {Array} parameters.values A list of option values
 * @return {*}
 */
LocusZoom.ScaleFunctions.add('ordinal_cycle', function (parameters, value, index) {
    var options = parameters.values;
    return options[ index % options.length ];
});

/**
 * Function for continuous interpolation of numerical values along a gradient with arbitrarily many break points.
 * @function interpolate
 * @parameters {Object} parameters
 * @parameters {Number[]} parameters.breaks  Array of numerical break points against which to evaluate the input value.
 *   Must be of equal length to values parameter and contain at least two elements. Input value will be evaluated for
 *   relative position between two break points n and n+1 and the returned value will be interpolated at a relative
 *   position between values n and n+1.
 * @parameters {*[]} parameters.values  Array of values to interpolate and return given evaluations against break
 *   points. Must be of equal length to breaks parameter and contain at least two elements. Each entry n represents
 *   the value to return if the input value matches the nth entry in breaks exactly. Note that this scale function
 *   uses d3.interpolate to provide for effective interpolation of many different value types, including numbers,
 *   colors, shapes, etc.
 * @parameters {*} parameters.null_value
 */
LocusZoom.ScaleFunctions.add('interpolate', function(parameters, input) {
    var breaks = parameters.breaks || [];
    var values = parameters.values || [];
    var nullval = (parameters.null_value ? parameters.null_value : null);
    if (breaks.length < 2 || breaks.length !== values.length) { return nullval; }
    if (typeof input == 'undefined' || input === null || isNaN(+input)) { return nullval; }
    if (+input <= parameters.breaks[0]) {
        return values[0];
    } else if (+input >= parameters.breaks[parameters.breaks.length - 1]) {
        return values[breaks.length - 1];
    } else {
        var upper_idx = null;
        breaks.forEach(function(brk, idx) {
            if (!idx) { return; }
            if (breaks[idx - 1] <= +input && breaks[idx] >= +input) { upper_idx = idx; }
        });
        if (upper_idx === null) { return nullval; }
        var normalized_input = (+input - breaks[upper_idx - 1]) / (breaks[upper_idx] - breaks[upper_idx - 1]);
        if (!isFinite(normalized_input)) { return nullval; }
        return d3.interpolate(values[upper_idx - 1], values[upper_idx])(normalized_input);
    }
});

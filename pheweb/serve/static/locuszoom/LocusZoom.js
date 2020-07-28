/**
 * @namespace
 */
var LocusZoom = {
    version: '0.11.0'
};

/**
 * Populate a single element with a LocusZoom plot.
 * selector can be a string for a DOM Query or a d3 selector.
 * @param {String} selector CSS selector for the container element where the plot will be mounted. Any pre-existing
 *   content in the container will be completely replaced.
 * @param {LocusZoom.DataSources} datasource Ensemble of data providers used by the plot
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
 * @returns {LocusZoom.Plot} The newly created plot instance
 */
LocusZoom.populate = function(selector, datasource, layout) {
    if (typeof selector == 'undefined') {
        throw new Error('LocusZoom.populate selector not defined');
    }
    // Empty the selector of any existing content
    d3.select(selector).html('');
    var plot;
    d3.select(selector).call(function() {
        // Require each containing element have an ID. If one isn't present, create one.
        if (typeof this.node().id == 'undefined') {
            var iterator = 0;
            while (!d3.select('#lz-' + iterator).empty()) { iterator++; }
            this.attr('id', '#lz-' + iterator);
        }
        // Create the plot
        plot = new LocusZoom.Plot(this.node().id, datasource, layout);
        plot.container = this.node();
        // Detect data-region and fill in state values if present
        if (typeof this.node().dataset !== 'undefined' && typeof this.node().dataset.region !== 'undefined') {
            var parsed_state = LocusZoom.parsePositionQuery(this.node().dataset.region);
            Object.keys(parsed_state).forEach(function(key) {
                plot.state[key] = parsed_state[key];
            });
        }
        // Add an SVG to the div and set its dimensions
        plot.svg = d3.select('div#' + plot.id)
            .append('svg')
            .attr('version', '1.1')
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('id', plot.id + '_svg').attr('class', 'lz-locuszoom')
            .style(plot.layout.style);
        plot.setDimensions();
        plot.positionPanels();
        // Initialize the plot
        plot.initialize();
        // If the plot has defined data sources then trigger its first mapping based on state values
        if (typeof datasource == 'object' && Object.keys(datasource).length) {
            plot.refresh();
        }
    });
    return plot;
};

/**
 * Populate arbitrarily many elements each with a LocusZoom plot
 *   using a common datasource and layout
 * @param {String} selector CSS selector for the container element where the plot will be mounted. Any pre-existing
 *   content in the container will be completely replaced.
 * @param {LocusZoom.DataSources} datasource Ensemble of data providers used by the plot
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
 * @returns {LocusZoom.Plot[]}
 */
LocusZoom.populateAll = function(selector, datasource, layout) {
    var plots = [];
    d3.selectAll(selector).each(function(d,i) {
        plots[i] = LocusZoom.populate(this, datasource, layout);
    });
    return plots;
};

/**
 * Convert an integer chromosome position to an SI string representation (e.g. 23423456 => "23.42" (Mb))
 * @param {Number} pos Position
 * @param {Number} [exp] Exponent to use for the returned string, eg 6=> MB. If not specified, will attempt to guess
 *   the most appropriate SI prefix based on the number provided.
 * @param {Boolean} [suffix=false] Whether or not to append a suffix (e.g. "Mb") to the end of the returned string
 * @returns {string}
 */
LocusZoom.positionIntToString = function(pos, exp, suffix) {
    var exp_symbols = { 0: '', 3: 'K', 6: 'M', 9: 'G' };
    suffix = suffix || false;
    if (isNaN(exp) || exp === null) {
        var log = Math.log(pos) / Math.LN10;
        exp = Math.min(Math.max(log - (log % 3), 0), 9);
    }
    var places_exp = exp - Math.floor((Math.log(pos) / Math.LN10).toFixed(exp + 3));
    var min_exp = Math.min(Math.max(exp, 0), 2);
    var places = Math.min(Math.max(places_exp, min_exp), 12);
    var ret = '' + (pos / Math.pow(10, exp)).toFixed(places);
    if (suffix && typeof exp_symbols[exp] !== 'undefined') {
        ret += ' ' + exp_symbols[exp] + 'b';
    }
    return ret;
};

/**
 * Convert an SI string chromosome position to an integer representation (e.g. "5.8 Mb" => 58000000)
 * @param {String} p The chromosome position
 * @returns {Number}
 */
LocusZoom.positionStringToInt = function(p) {
    var val = p.toUpperCase();
    val = val.replace(/,/g, '');
    var suffixre = /([KMG])[B]*$/;
    var suffix = suffixre.exec(val);
    var mult = 1;
    if (suffix) {
        if (suffix[1] === 'M') {
            mult = 1e6;
        } else if (suffix[1] === 'G') {
            mult = 1e9;
        } else {
            mult = 1e3; //K
        }
        val = val.replace(suffixre,'');
    }
    val = Number(val) * mult;
    return val;
};

/**
 * Parse region queries into their constituent parts
 * TODO: handle genes (or send off to API)
 * @param {String} x A chromosome position query. May be any of the forms `chr:start-end`, `chr:center+offset`,
 *   or `chr:pos`
 * @returns {{chr:*, start: *, end:*} | {chr:*, position:*}}
 */
LocusZoom.parsePositionQuery = function(x) {
    var chrposoff = /^(\w+):([\d,.]+[kmgbKMGB]*)([-+])([\d,.]+[kmgbKMGB]*)$/;
    var chrpos = /^(\w+):([\d,.]+[kmgbKMGB]*)$/;
    var match = chrposoff.exec(x);
    if (match) {
        if (match[3] === '+') {
            var center = LocusZoom.positionStringToInt(match[2]);
            var offset = LocusZoom.positionStringToInt(match[4]);
            return {
                chr:match[1],
                start: center - offset,
                end: center + offset
            };
        } else {
            return {
                chr: match[1],
                start: LocusZoom.positionStringToInt(match[2]),
                end: LocusZoom.positionStringToInt(match[4])
            };
        }
    }
    match = chrpos.exec(x);
    if (match) {
        return {
            chr:match[1],
            position: LocusZoom.positionStringToInt(match[2])
        };
    }
    return null;
};

/**
 * Generate a "pretty" set of ticks (multiples of 1, 2, or 5 on the same order of magnitude for the range)
 *   Based on R's "pretty" function: https://github.com/wch/r-source/blob/b156e3a711967f58131e23c1b1dc1ea90e2f0c43/src/appl/pretty.c
 * @param {Number[]} range A two-item array specifying [low, high] values for the axis range
 * @param {('low'|'high'|'both'|'neither')} [clip_range='neither'] What to do if first and last generated ticks extend
 *   beyond the range. Set this to "low", "high", "both", or "neither" to clip the first (low) or last (high) tick to
 *   be inside the range or allow them to extend beyond.
 *   e.g. "low" will clip the first (low) tick if it extends beyond the low end of the range but allow the
 *  last (high) tick to extend beyond the range. "both" clips both ends, "neither" allows both to extend beyond.
 * @param {Number} [target_tick_count=5] The approximate number of ticks you would like to be returned; may not be exact
 * @returns {Number[]}
 */
LocusZoom.prettyTicks = function(range, clip_range, target_tick_count) {
    if (typeof target_tick_count == 'undefined' || isNaN(parseInt(target_tick_count))) {
        target_tick_count = 5;
    }
    target_tick_count = parseInt(target_tick_count);

    var min_n = target_tick_count / 3;
    var shrink_sml = 0.75;
    var high_u_bias = 1.5;
    var u5_bias = 0.5 + 1.5 * high_u_bias;

    var d = Math.abs(range[0] - range[1]);
    var c = d / target_tick_count;
    if ((Math.log(d) / Math.LN10) < -2) {
        c = (Math.max(Math.abs(d)) * shrink_sml) / min_n;
    }

    var base = Math.pow(10, Math.floor(Math.log(c) / Math.LN10));
    var base_toFixed = 0;
    if (base < 1 && base !== 0) {
        base_toFixed = Math.abs(Math.round(Math.log(base) / Math.LN10));
    }

    var unit = base;
    if ( ((2 * base) - c) < (high_u_bias * (c - unit)) ) {
        unit = 2 * base;
        if ( ((5 * base) - c) < (u5_bias * (c - unit)) ) {
            unit = 5 * base;
            if ( ((10 * base) - c) < (high_u_bias * (c - unit)) ) {
                unit = 10 * base;
            }
        }
    }

    var ticks = [];
    var i = parseFloat( (Math.floor(range[0] / unit) * unit).toFixed(base_toFixed) );
    while (i < range[1]) {
        ticks.push(i);
        i += unit;
        if (base_toFixed > 0) {
            i = parseFloat(i.toFixed(base_toFixed));
        }
    }
    ticks.push(i);

    if (typeof clip_range == 'undefined' || ['low', 'high', 'both', 'neither'].indexOf(clip_range) === -1) {
        clip_range = 'neither';
    }
    if (clip_range === 'low' || clip_range === 'both') {
        if (ticks[0] < range[0]) { ticks = ticks.slice(1); }
    }
    if (clip_range === 'high' || clip_range === 'both') {
        if (ticks[ticks.length - 1] > range[1]) { ticks.pop(); }
    }

    return ticks;
};

/**
 * Make an AJAX request and return a promise.
 * From http://www.html5rocks.com/en/tutorials/cors/
 *   and with promises from https://gist.github.com/kriskowal/593076
 *
 * @param {String} method The HTTP verb
 * @param {String} url
 * @param {String} [body] The request body to send to the server
 * @param {Object} [headers] Object of custom request headers
 * @param {Number} [timeout] If provided, wait this long (in ms) before timing out
 * @returns {Promise}
 */
LocusZoom.createCORSPromise = function (method, url, body, headers, timeout) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        if ('withCredentials' in xhr) {
            // Check if the XMLHttpRequest object has a "withCredentials" property.
            // "withCredentials" only exists on XMLHTTPRequest2 objects.
            xhr.open(method, url, true);
        } else if (typeof XDomainRequest != 'undefined') {
            // Otherwise, check if XDomainRequest.
            // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            // Otherwise, CORS is not supported by the browser.
            xhr = null;
        }
        if (xhr) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0 ) {
                        resolve(xhr.response);
                    } else {
                        reject('HTTP ' + xhr.status + ' for ' + url);
                    }
                }
            };
            timeout && setTimeout(reject, timeout);
            body = typeof body !== 'undefined' ? body : '';
            if (typeof headers !== 'undefined') {
                for (var header in headers) {
                    xhr.setRequestHeader(header, headers[header]);
                }
            }
            // Send the request
            xhr.send(body);
        }
    });
};

/**
 * Check that position fields (chr, start, end) are provided where appropriate, and ensure that the plot fits within
 *  any constraints specified by the layout
 *
 * This function has side effects; it mutates the proposed state in order to meet certain bounds checks etc.
 * @param {Object} new_state
 * @param {Number} new_state.chr
 * @param {Number} new_state.start
 * @param {Number} new_state.end
 * @param {Object} layout
 * @returns {*|{}}
 */
LocusZoom._updateStatePosition = function(new_state, layout) {

    new_state = new_state || {};
    layout = layout || {};

    // If a "chr", "start", and "end" are present then resolve start and end
    // to numeric values that are not decimal, negative, or flipped
    var validated_region = false;
    if (typeof new_state.chr != 'undefined' && typeof new_state.start != 'undefined' && typeof new_state.end != 'undefined') {
        // Determine a numeric scale and midpoint for the attempted region,
        var attempted_midpoint = null; var attempted_scale;
        new_state.start = Math.max(parseInt(new_state.start), 1);
        new_state.end = Math.max(parseInt(new_state.end), 1);
        if (isNaN(new_state.start) && isNaN(new_state.end)) {
            new_state.start = 1;
            new_state.end = 1;
            attempted_midpoint = 0.5;
            attempted_scale = 0;
        } else if (isNaN(new_state.start) || isNaN(new_state.end)) {
            attempted_midpoint = new_state.start || new_state.end;
            attempted_scale = 0;
            new_state.start = (isNaN(new_state.start) ? new_state.end : new_state.start);
            new_state.end = (isNaN(new_state.end) ? new_state.start : new_state.end);
        } else {
            attempted_midpoint = Math.round((new_state.start + new_state.end) / 2);
            attempted_scale = new_state.end - new_state.start;
            if (attempted_scale < 0) {
                var temp = new_state.start;
                new_state.end = new_state.start;
                new_state.start = temp;
                attempted_scale = new_state.end - new_state.start;
            }
            if (attempted_midpoint < 0) {
                new_state.start = 1;
                new_state.end = 1;
                attempted_scale = 0;
            }
        }
        validated_region = true;
    }

    // Constrain w/r/t layout-defined minimum region scale
    if (!isNaN(layout.min_region_scale) && validated_region && attempted_scale < layout.min_region_scale) {
        new_state.start = Math.max(attempted_midpoint - Math.floor(layout.min_region_scale / 2), 1);
        new_state.end = new_state.start + layout.min_region_scale;
    }

    // Constrain w/r/t layout-defined maximum region scale
    if (!isNaN(layout.max_region_scale) && validated_region && attempted_scale > layout.max_region_scale) {
        new_state.start = Math.max(attempted_midpoint - Math.floor(layout.max_region_scale / 2), 1);
        new_state.end = new_state.start + layout.max_region_scale;
    }

    return new_state;
};

//
/**
 * Replace placeholders in an html string with field values defined in a data object
 *  Only works on scalar values in data! Will ignore non-scalars. This is useful in, eg, tooltip templates.
 *
 *  NOTE: Trusts content exactly as given. XSS prevention is the responsibility of the implementer.
 * @param {Object} data
 * @param {String} html A placeholder string in which to substitute fields. Supports several template options:
 *   `{{field_name}}` is a variable placeholder for the value of `field_name` from the provided data
 *   `{{#if field_name}} Conditional text {{/if}}` will insert the contents of the tag only if the value exists.
 *     Since this is only an existence check, **variables with a value of 0 will be evaluated as true**.
 *     This can be used with namespaced values, `{{#if assoc:field}}`; any dynamic namespacing will be applied when the
 *     layout is first retrieved.
 * @returns {string}
 */
LocusZoom.parseFields = function (data, html) {
    if (typeof data != 'object') {
        throw new Error('LocusZoom.parseFields invalid arguments: data is not an object');
    }
    if (typeof html != 'string') {
        throw new Error('LocusZoom.parseFields invalid arguments: html is not a string');
    }
    // `tokens` is like [token,...]
    // `token` is like {text: '...'} or {variable: 'foo|bar'} or {condition: 'foo|bar'} or {close: 'if'}
    var tokens = [];
    var regex = /\{\{(?:(#if )?([A-Za-z0-9_:|]+)|(\/if))\}\}/;
    while (html.length > 0) {
        var m = regex.exec(html);
        if (!m) { tokens.push({text: html}); html = ''; }
        else if (m.index !== 0) { tokens.push({text: html.slice(0, m.index)}); html = html.slice(m.index); }
        else if (m[1] === '#if ') { tokens.push({condition: m[2]}); html = html.slice(m[0].length); }
        else if (m[2]) { tokens.push({variable: m[2]}); html = html.slice(m[0].length); }
        else if (m[3] === '/if') { tokens.push({close: 'if'}); html = html.slice(m[0].length); }
        else {
            console.error('Error tokenizing tooltip when remaining template is ' + JSON.stringify(html) +
                          ' and previous tokens are ' + JSON.stringify(tokens) +
                          ' and current regex match is ' + JSON.stringify([m[1], m[2], m[3]]));
            html = html.slice(m[0].length);
        }
    }
    var astify = function() {
        var token = tokens.shift();
        if (typeof token.text !== 'undefined' || token.variable) {
            return token;
        } else if (token.condition) {
            token.then = [];
            while(tokens.length > 0) {
                if (tokens[0].close === 'if') { tokens.shift(); break; }
                token.then.push(astify());
            }
            return token;
        } else {
            console.error('Error making tooltip AST due to unknown token ' + JSON.stringify(token));
            return { text: '' };
        }
    };
    // `ast` is like [thing,...]
    // `thing` is like {text: "..."} or {variable:"foo|bar"} or {condition: "foo|bar", then:[thing,...]}
    var ast = [];
    while (tokens.length > 0) {
        ast.push(astify());
    }

    var resolve = function(variable) {
        if (!resolve.cache.hasOwnProperty(variable)) {
            resolve.cache[variable] = (new LocusZoom.Data.Field(variable)).resolve(data);
        }
        return resolve.cache[variable];
    };
    resolve.cache = {};
    var render_node = function(node) {
        if (typeof node.text !== 'undefined') {
            return node.text;
        } else if (node.variable) {
            try {
                var value = resolve(node.variable);
                if (['string','number','boolean'].indexOf(typeof value) !== -1) { return value; }
                if (value === null) { return ''; }
            } catch (error) { console.error('Error while processing variable ' + JSON.stringify(node.variable)); }
            return '{{' + node.variable + '}}';
        } else if (node.condition) {
            try {
                var condition = resolve(node.condition);
                if (condition || condition === 0) {
                    return node.then.map(render_node).join('');
                }
            } catch (error) { console.error('Error while processing condition ' + JSON.stringify(node.variable)); }
            return '';
        } else { console.error('Error rendering tooltip due to unknown AST node ' + JSON.stringify(node)); }
    };
    return ast.map(render_node).join('');
};

/**
 * Shortcut method for getting the data bound to a tool tip.
 * @param {Element} node
 * @returns {*} The first element of data bound to the tooltip
 */
LocusZoom.getToolTipData = function(node) {
    if (typeof node != 'object' || typeof node.parentNode == 'undefined') {
        throw new Error('Invalid node object');
    }
    // If this node is a locuszoom tool tip then return its data
    var selector = d3.select(node);
    if (selector.classed('lz-data_layer-tooltip') && typeof selector.data()[0] != 'undefined') {
        return selector.data()[0];
    } else {
        return LocusZoom.getToolTipData(node.parentNode);
    }
};

/**
 * Shortcut method for getting a reference to the data layer that generated a tool tip.
 * @param {Element} node The element associated with the tooltip, or any element contained inside the tooltip
 * @returns {LocusZoom.DataLayer}
 */
LocusZoom.getToolTipDataLayer = function(node) {
    var data = LocusZoom.getToolTipData(node);
    if (data.getDataLayer) { return data.getDataLayer(); }
    return null;
};

/**
 * Shortcut method for getting a reference to the panel that generated a tool tip.
 * @param {Element} node The element associated with the tooltip, or any element contained inside the tooltip
 * @returns {LocusZoom.Panel}
 */
LocusZoom.getToolTipPanel = function(node) {
    var data_layer = LocusZoom.getToolTipDataLayer(node);
    if (data_layer) { return data_layer.parent; }
    return null;
};

/**
 * Shortcut method for getting a reference to the plot that generated a tool tip.
 * @param {Element} node The element associated with the tooltip, or any element contained inside the tooltip
 * @returns {LocusZoom.Plot}
 */
LocusZoom.getToolTipPlot = function(node) {
    var panel = LocusZoom.getToolTipPanel(node);
    if (panel) { return panel.parent; }
    return null;
};

/**
 * Generate a curtain object for a plot, panel, or any other subdivision of a layout
 * The panel curtain, like the plot curtain is an HTML overlay that obscures the entire panel. It can be styled
 *   arbitrarily and display arbitrary messages. It is useful for reporting error messages visually to an end user
 *   when the error renders the panel unusable.
 *   TODO: Improve type doc here
 * @returns {object}
 */
LocusZoom.generateCurtain = function() {
    var curtain = {
        showing: false,
        selector: null,
        content_selector: null,
        hide_delay: null,

        /**
         * Generate the curtain. Any content (string) argument passed will be displayed in the curtain as raw HTML.
         *   CSS (object) can be passed which will apply styles to the curtain and its content.
         * @param {string} content Content to be displayed on the curtain (as raw HTML)
         * @param {object} css Apply the specified styles to the curtain and its contents
         */
        show: function(content, css) {
            if (!this.curtain.showing) {
                this.curtain.selector = d3.select(this.parent_plot.svg.node().parentNode).insert('div')
                    .attr('class', 'lz-curtain').attr('id', this.id + '.curtain');
                this.curtain.content_selector = this.curtain.selector.append('div').attr('class', 'lz-curtain-content');
                this.curtain.selector.append('div').attr('class', 'lz-curtain-dismiss').html('Dismiss')
                    .on('click', function() {
                        this.curtain.hide();
                    }.bind(this));
                this.curtain.showing = true;
            }
            return this.curtain.update(content, css);
        }.bind(this),

        /**
         * Update the content and css of the curtain that's currently being shown. This method also adjusts the size
         *   and positioning of the curtain to ensure it still covers the entire panel with no overlap.
         * @param {string} content Content to be displayed on the curtain (as raw HTML)
         * @param {object} css Apply the specified styles to the curtain and its contents
         */
        update: function(content, css) {
            if (!this.curtain.showing) { return this.curtain; }
            clearTimeout(this.curtain.hide_delay);
            // Apply CSS if provided
            if (typeof css == 'object') {
                this.curtain.selector.style(css);
            }
            // Update size and position
            var page_origin = this.getPageOrigin();
            this.curtain.selector.style({
                top: page_origin.y + 'px',
                left: page_origin.x + 'px',
                width: this.layout.width + 'px',
                height: this.layout.height + 'px'
            });
            this.curtain.content_selector.style({
                'max-width': (this.layout.width - 40) + 'px',
                'max-height': (this.layout.height - 40) + 'px'
            });
            // Apply content if provided
            if (typeof content == 'string') {
                this.curtain.content_selector.html(content);
            }
            return this.curtain;
        }.bind(this),

        /**
         * Remove the curtain
         * @param {number} delay Time to wait (in ms)
         */
        hide: function(delay) {
            if (!this.curtain.showing) { return this.curtain; }
            // If a delay was passed then defer to a timeout
            if (typeof delay == 'number') {
                clearTimeout(this.curtain.hide_delay);
                this.curtain.hide_delay = setTimeout(this.curtain.hide, delay);
                return this.curtain;
            }
            // Remove curtain
            this.curtain.selector.remove();
            this.curtain.selector = null;
            this.curtain.content_selector = null;
            this.curtain.showing = false;
            return this.curtain;
        }.bind(this)
    };
    return curtain;
};

/**
 * Generate a loader object for a plot, panel, or any other subdivision of a layout
 *
 * The panel loader is a small HTML overlay that appears in the lower left corner of the panel. It cannot be styled
 *   arbitrarily, but can show a custom message and show a minimalist loading bar that can be updated to specific
 *   completion percentages or be animated.
 * TODO Improve type documentation
 * @returns {object}
 */
LocusZoom.generateLoader = function() {
    var loader = {
        showing: false,
        selector: null,
        content_selector: null,
        progress_selector: null,
        cancel_selector: null,

        /**
         * Show a loading indicator
         * @param {string} [content='Loading...'] Loading message (displayed as raw HTML)
         */
        show: function(content) {
            // Generate loader
            if (!this.loader.showing) {
                this.loader.selector = d3.select(this.parent_plot.svg.node().parentNode).insert('div')
                    .attr('class', 'lz-loader').attr('id', this.id + '.loader');
                this.loader.content_selector = this.loader.selector.append('div')
                    .attr('class', 'lz-loader-content');
                this.loader.progress_selector = this.loader.selector
                    .append('div').attr('class', 'lz-loader-progress-container')
                    .append('div').attr('class', 'lz-loader-progress');
                /* TODO: figure out how to make this cancel button work
                this.loader.cancel_selector = this.loader.selector.append("div")
                    .attr("class", "lz-loader-cancel").html("Cancel")
                    .on("click", function(){
                        this.loader.hide();
                    }.bind(this));
                */
                this.loader.showing = true;
                if (typeof content == 'undefined') { content = 'Loading...'; }
            }
            return this.loader.update(content);
        }.bind(this),

        /**
         * Update the currently displayed loader and ensure the new content is positioned correctly.
         * @param {string} content The text to display (as raw HTML). If not a string, will be ignored.
         * @param {number} [percent] A number from 1-100. If a value is specified, it will stop all animations
         *   in progress.
         */
        update: function(content, percent) {
            if (!this.loader.showing) { return this.loader; }
            clearTimeout(this.loader.hide_delay);
            // Apply content if provided
            if (typeof content == 'string') {
                this.loader.content_selector.html(content);
            }
            // Update size and position
            var padding = 6; // is there a better place to store/define this?
            var page_origin = this.getPageOrigin();
            var loader_boundrect = this.loader.selector.node().getBoundingClientRect();
            this.loader.selector.style({
                top: (page_origin.y + this.layout.height - loader_boundrect.height - padding) + 'px',
                left: (page_origin.x + padding) + 'px'
            });
            /* Uncomment this code when a functional cancel button can be shown
            var cancel_boundrect = this.loader.cancel_selector.node().getBoundingClientRect();
            this.loader.content_selector.style({
                "padding-right": (cancel_boundrect.width + padding) + "px"
            });
            */
            // Apply percent if provided
            if (typeof percent == 'number') {
                this.loader.progress_selector.style({
                    width: (Math.min(Math.max(percent, 1), 100)) + '%'
                });
            }
            return this.loader;
        }.bind(this),

        /**
         * Adds a class to the loading bar that makes it loop infinitely in a loading animation. Useful when exact
         *   percent progress is not available.
         */
        animate: function() {
            this.loader.progress_selector.classed('lz-loader-progress-animated', true);
            return this.loader;
        }.bind(this),

        /**
         *  Sets the loading bar in the loader to percentage width equal to the percent (number) value passed. Percents
         *    will automatically be limited to a range of 1 to 100. Will stop all animations in progress.
         */
        setPercentCompleted: function(percent) {
            this.loader.progress_selector.classed('lz-loader-progress-animated', false);
            return this.loader.update(null, percent);
        }.bind(this),

        /**
         * Remove the loader
         * @param {number} delay Time to wait (in ms)
         */
        hide: function(delay) {
            if (!this.loader.showing) { return this.loader; }
            // If a delay was passed then defer to a timeout
            if (typeof delay == 'number') {
                clearTimeout(this.loader.hide_delay);
                this.loader.hide_delay = setTimeout(this.loader.hide, delay);
                return this.loader;
            }
            // Remove loader
            this.loader.selector.remove();
            this.loader.selector = null;
            this.loader.content_selector = null;
            this.loader.progress_selector = null;
            this.loader.cancel_selector = null;
            this.loader.showing = false;
            return this.loader;
        }.bind(this)
    };
    return loader;
};

/**
 * Create a new subclass following classical inheritance patterns. Some registry singletons use this internally to
 *   enable code reuse and customization of known LZ core functionality.
 *
 * @param {Function} parent A parent class constructor that will be extended by the child class
 * @param {Object} extra An object of additional properties and methods to add/override behavior for the child class.
 *   The special "constructor" property can be used to specify a custom constructor, or it will call parent by default.
 *   Implementer must manage super calls when overriding the constructor.
 * @returns {Function} The constructor for the new child class
 */
LocusZoom.subclass = function(parent, extra) {
    if (typeof parent !== 'function' ) {
        throw new Error('Parent must be a callable constructor');
    }

    extra = extra || {};
    var Sub = extra.hasOwnProperty('constructor') ? extra.constructor : function() {
        parent.apply(this, arguments);
    };

    Sub.prototype = Object.create(parent.prototype);
    Object.keys(extra).forEach(function(k) {
        Sub.prototype[k] = extra[k];
    });
    return Sub;
};


/**
 * LocusZoom optional extensions will live under this namespace.
 *
 * Extension code is not part of the core LocusZoom app.js bundle.
 * @namespace
 * @public
 */
LocusZoom.ext = {};

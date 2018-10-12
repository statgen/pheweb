(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'd3',
            'Q'
        ], function (d3, Q) {
            // amd
            return root.LocusZoom = factory(d3, Q);
        });
    } else if (typeof module === 'object' && module.exports) {
        // commonJS
        module.exports = root.LocusZoom = factory(require('d3'), require('Q'));
    } else {
        // globals
        root.LocusZoom = factory(root.d3, root.Q);
    }
}(this, function (d3, Q) {
    var semanticVersionIsOk = function (minimum_version, current_version) {
        // handle the trivial case
        if (current_version == minimum_version) {
            return true;
        }    // compare semantic versions by component as integers
        // compare semantic versions by component as integers
        var minimum_version_array = minimum_version.split('.');
        var current_version_array = current_version.split('.');
        var version_is_ok = false;
        minimum_version_array.forEach(function (d, i) {
            if (!version_is_ok && +current_version_array[i] > +minimum_version_array[i]) {
                version_is_ok = true;
            }
        });
        return version_is_ok;
    };
    try {
        // Verify dependency: d3.js
        var minimum_d3_version = '3.5.6';
        if (typeof d3 != 'object') {
            throw 'd3 dependency not met. Library missing.';
        }
        if (!semanticVersionIsOk(minimum_d3_version, d3.version)) {
            throw 'd3 dependency not met. Outdated version detected.\nRequired d3 version: ' + minimum_d3_version + ' or higher (found: ' + d3.version + ').';
        }    // Verify dependency: Q.js
        // Verify dependency: Q.js
        if (typeof Q != 'function') {
            throw 'Q dependency not met. Library missing.';
        }    // ESTemplate: module content goes here
        // ESTemplate: module content goes here
        ;
        var LocusZoom = { version: '0.8.2' };
        /**
 * Populate a single element with a LocusZoom plot.
 * selector can be a string for a DOM Query or a d3 selector.
 * @param {String} selector CSS selector for the container element where the plot will be mounted. Any pre-existing
 *   content in the container will be completely replaced.
 * @param {LocusZoom.DataSources} datasource Ensemble of data providers used by the plot
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
 * @returns {LocusZoom.Plot} The newly created plot instance
 */
        LocusZoom.populate = function (selector, datasource, layout) {
            if (typeof selector == 'undefined') {
                throw 'LocusZoom.populate selector not defined';
            }
            // Empty the selector of any existing content
            d3.select(selector).html('');
            var plot;
            d3.select(selector).call(function () {
                // Require each containing element have an ID. If one isn't present, create one.
                if (typeof this.node().id == 'undefined') {
                    var iterator = 0;
                    while (!d3.select('#lz-' + iterator).empty()) {
                        iterator++;
                    }
                    this.attr('id', '#lz-' + iterator);
                }
                // Create the plot
                plot = new LocusZoom.Plot(this.node().id, datasource, layout);
                plot.container = this.node();
                // Detect data-region and fill in state values if present
                if (typeof this.node().dataset !== 'undefined' && typeof this.node().dataset.region !== 'undefined') {
                    var parsed_state = LocusZoom.parsePositionQuery(this.node().dataset.region);
                    Object.keys(parsed_state).forEach(function (key) {
                        plot.state[key] = parsed_state[key];
                    });
                }
                // Add an SVG to the div and set its dimensions
                plot.svg = d3.select('div#' + plot.id).append('svg').attr('version', '1.1').attr('xmlns', 'http://www.w3.org/2000/svg').attr('id', plot.id + '_svg').attr('class', 'lz-locuszoom').style(plot.layout.style);
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
        LocusZoom.populateAll = function (selector, datasource, layout) {
            var plots = [];
            d3.selectAll(selector).each(function (d, i) {
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
        LocusZoom.positionIntToString = function (pos, exp, suffix) {
            var exp_symbols = {
                0: '',
                3: 'K',
                6: 'M',
                9: 'G'
            };
            suffix = suffix || false;
            if (isNaN(exp) || exp === null) {
                var log = Math.log(pos) / Math.LN10;
                exp = Math.min(Math.max(log - log % 3, 0), 9);
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
        LocusZoom.positionStringToInt = function (p) {
            var val = p.toUpperCase();
            val = val.replace(/,/g, '');
            var suffixre = /([KMG])[B]*$/;
            var suffix = suffixre.exec(val);
            var mult = 1;
            if (suffix) {
                if (suffix[1] === 'M') {
                    mult = 1000000;
                } else if (suffix[1] === 'G') {
                    mult = 1000000000;
                } else {
                    mult = 1000;    //K
                }
                val = val.replace(suffixre, '');
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
        LocusZoom.parsePositionQuery = function (x) {
            var chrposoff = /^(\w+):([\d,.]+[kmgbKMGB]*)([-+])([\d,.]+[kmgbKMGB]*)$/;
            var chrpos = /^(\w+):([\d,.]+[kmgbKMGB]*)$/;
            var match = chrposoff.exec(x);
            if (match) {
                if (match[3] === '+') {
                    var center = LocusZoom.positionStringToInt(match[2]);
                    var offset = LocusZoom.positionStringToInt(match[4]);
                    return {
                        chr: match[1],
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
                    chr: match[1],
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
        LocusZoom.prettyTicks = function (range, clip_range, target_tick_count) {
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
            if (Math.log(d) / Math.LN10 < -2) {
                c = Math.max(Math.abs(d)) * shrink_sml / min_n;
            }
            var base = Math.pow(10, Math.floor(Math.log(c) / Math.LN10));
            var base_toFixed = 0;
            if (base < 1 && base !== 0) {
                base_toFixed = Math.abs(Math.round(Math.log(base) / Math.LN10));
            }
            var unit = base;
            if (2 * base - c < high_u_bias * (c - unit)) {
                unit = 2 * base;
                if (5 * base - c < u5_bias * (c - unit)) {
                    unit = 5 * base;
                    if (10 * base - c < high_u_bias * (c - unit)) {
                        unit = 10 * base;
                    }
                }
            }
            var ticks = [];
            var i = parseFloat((Math.floor(range[0] / unit) * unit).toFixed(base_toFixed));
            while (i < range[1]) {
                ticks.push(i);
                i += unit;
                if (base_toFixed > 0) {
                    i = parseFloat(i.toFixed(base_toFixed));
                }
            }
            ticks.push(i);
            if (typeof clip_range == 'undefined' || [
                    'low',
                    'high',
                    'both',
                    'neither'
                ].indexOf(clip_range) === -1) {
                clip_range = 'neither';
            }
            if (clip_range === 'low' || clip_range === 'both') {
                if (ticks[0] < range[0]) {
                    ticks = ticks.slice(1);
                }
            }
            if (clip_range === 'high' || clip_range === 'both') {
                if (ticks[ticks.length - 1] > range[1]) {
                    ticks.pop();
                }
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
 * @param {String} body The request body to send to the server
 * @param {Object} headers Object of custom request headers
 * @param {Number} [timeout] If provided, wait this long (in ms) before timing out
 * @returns {Promise}
 */
        LocusZoom.createCORSPromise = function (method, url, body, headers, timeout) {
            var response = Q.defer();
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
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 0) {
                            response.resolve(xhr.response);
                        } else {
                            response.reject('HTTP ' + xhr.status + ' for ' + url);
                        }
                    }
                };
                timeout && setTimeout(response.reject, timeout);
                body = typeof body !== 'undefined' ? body : '';
                if (typeof headers !== 'undefined') {
                    for (var header in headers) {
                        xhr.setRequestHeader(header, headers[header]);
                    }
                }
                // Send the request
                xhr.send(body);
            }
            return response.promise;
        };
        /**
 * Validate a (presumed complete) plot state object against internal rules for consistency, and ensure the plot fits
 *   within any constraints imposed by the layout.
 * @param {Object} new_state
 * @param {Number} new_state.start
 * @param {Number} new_state.end
 * @param {Object} layout
 * @returns {*|{}}
 */
        LocusZoom.validateState = function (new_state, layout) {
            new_state = new_state || {};
            layout = layout || {};
            // If a "chr", "start", and "end" are present then resolve start and end
            // to numeric values that are not decimal, negative, or flipped
            var validated_region = false;
            if (typeof new_state.chr != 'undefined' && typeof new_state.start != 'undefined' && typeof new_state.end != 'undefined') {
                // Determine a numeric scale and midpoint for the attempted region,
                var attempted_midpoint = null;
                var attempted_scale;
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
                    new_state.start = isNaN(new_state.start) ? new_state.end : new_state.start;
                    new_state.end = isNaN(new_state.end) ? new_state.start : new_state.end;
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
 *  Only works on scalar values! Will ignore non-scalars.
 *
 *  NOTE: Trusts content exactly as given. XSS prevention is the responsibility of the implementer.
 * @param {Object} data
 * @param {String} html A placeholder string in which to substitute fields. Supports several template options:
 *   `{{field_name}}` is a variable placeholder for the value of `field_name` from the provided data
 *   `{{#if {{field_name}} }} Conditional text {{/if}} will insert the contents of the tag only if the value exists.
 *     Since this is only an existence check, **variables with a value of 0 will be evaluated as true**.
 * @returns {string}
 */
        LocusZoom.parseFields = function (data, html) {
            if (typeof data != 'object') {
                throw 'LocusZoom.parseFields invalid arguments: data is not an object';
            }
            if (typeof html != 'string') {
                throw 'LocusZoom.parseFields invalid arguments: html is not a string';
            }
            // `tokens` is like [token,...]
            // `token` is like {text: '...'} or {variable: 'foo|bar'} or {condition: 'foo|bar'} or {close: 'if'}
            var tokens = [];
            var regex = /\{\{(?:(#if )?([A-Za-z0-9_:|]+)|(\/if))\}\}/;
            while (html.length > 0) {
                var m = regex.exec(html);
                if (!m) {
                    tokens.push({ text: html });
                    html = '';
                } else if (m.index !== 0) {
                    tokens.push({ text: html.slice(0, m.index) });
                    html = html.slice(m.index);
                } else if (m[1] === '#if ') {
                    tokens.push({ condition: m[2] });
                    html = html.slice(m[0].length);
                } else if (m[2]) {
                    tokens.push({ variable: m[2] });
                    html = html.slice(m[0].length);
                } else if (m[3] === '/if') {
                    tokens.push({ close: 'if' });
                    html = html.slice(m[0].length);
                } else {
                    console.error('Error tokenizing tooltip when remaining template is ' + JSON.stringify(html) + ' and previous tokens are ' + JSON.stringify(tokens) + ' and current regex match is ' + JSON.stringify([
                        m[1],
                        m[2],
                        m[3]
                    ]));
                    html = html.slice(m[0].length);
                }
            }
            var astify = function () {
                var token = tokens.shift();
                if (typeof token.text !== 'undefined' || token.variable) {
                    return token;
                } else if (token.condition) {
                    token.then = [];
                    while (tokens.length > 0) {
                        if (tokens[0].close === 'if') {
                            tokens.shift();
                            break;
                        }
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
            while (tokens.length > 0)
                ast.push(astify());
            var resolve = function (variable) {
                if (!resolve.cache.hasOwnProperty(variable)) {
                    resolve.cache[variable] = new LocusZoom.Data.Field(variable).resolve(data);
                }
                return resolve.cache[variable];
            };
            resolve.cache = {};
            var render_node = function (node) {
                if (typeof node.text !== 'undefined') {
                    return node.text;
                } else if (node.variable) {
                    try {
                        var value = resolve(node.variable);
                        if ([
                                'string',
                                'number',
                                'boolean'
                            ].indexOf(typeof value) !== -1) {
                            return value;
                        }
                        if (value === null) {
                            return '';
                        }
                    } catch (error) {
                        console.error('Error while processing variable ' + JSON.stringify(node.variable));
                    }
                    return '{{' + node.variable + '}}';
                } else if (node.condition) {
                    try {
                        var condition = resolve(node.condition);
                        if (condition || condition === 0) {
                            return node.then.map(render_node).join('');
                        }
                    } catch (error) {
                        console.error('Error while processing condition ' + JSON.stringify(node.variable));
                    }
                    return '';
                } else {
                    console.error('Error rendering tooltip due to unknown AST node ' + JSON.stringify(node));
                }
            };
            return ast.map(render_node).join('');
        };
        /**
 * Shortcut method for getting the data bound to a tool tip.
 * @param {Element} node
 * @returns {*} The first element of data bound to the tooltip
 */
        LocusZoom.getToolTipData = function (node) {
            if (typeof node != 'object' || typeof node.parentNode == 'undefined') {
                throw 'Invalid node object';
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
        LocusZoom.getToolTipDataLayer = function (node) {
            var data = LocusZoom.getToolTipData(node);
            if (data.getDataLayer) {
                return data.getDataLayer();
            }
            return null;
        };
        /**
 * Shortcut method for getting a reference to the panel that generated a tool tip.
 * @param {Element} node The element associated with the tooltip, or any element contained inside the tooltip
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.getToolTipPanel = function (node) {
            var data_layer = LocusZoom.getToolTipDataLayer(node);
            if (data_layer) {
                return data_layer.parent;
            }
            return null;
        };
        /**
 * Shortcut method for getting a reference to the plot that generated a tool tip.
 * @param {Element} node The element associated with the tooltip, or any element contained inside the tooltip
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.getToolTipPlot = function (node) {
            var panel = LocusZoom.getToolTipPanel(node);
            if (panel) {
                return panel.parent;
            }
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
        LocusZoom.generateCurtain = function () {
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
                show: function (content, css) {
                    if (!this.curtain.showing) {
                        this.curtain.selector = d3.select(this.parent_plot.svg.node().parentNode).insert('div').attr('class', 'lz-curtain').attr('id', this.id + '.curtain');
                        this.curtain.content_selector = this.curtain.selector.append('div').attr('class', 'lz-curtain-content');
                        this.curtain.selector.append('div').attr('class', 'lz-curtain-dismiss').html('Dismiss').on('click', function () {
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
                update: function (content, css) {
                    if (!this.curtain.showing) {
                        return this.curtain;
                    }
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
                        'max-width': this.layout.width - 40 + 'px',
                        'max-height': this.layout.height - 40 + 'px'
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
                hide: function (delay) {
                    if (!this.curtain.showing) {
                        return this.curtain;
                    }
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
        LocusZoom.generateLoader = function () {
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
                show: function (content) {
                    // Generate loader
                    if (!this.loader.showing) {
                        this.loader.selector = d3.select(this.parent_plot.svg.node().parentNode).insert('div').attr('class', 'lz-loader').attr('id', this.id + '.loader');
                        this.loader.content_selector = this.loader.selector.append('div').attr('class', 'lz-loader-content');
                        this.loader.progress_selector = this.loader.selector.append('div').attr('class', 'lz-loader-progress-container').append('div').attr('class', 'lz-loader-progress');
                        /* TODO: figure out how to make this cancel button work
                this.loader.cancel_selector = this.loader.selector.append("div")
                    .attr("class", "lz-loader-cancel").html("Cancel")
                    .on("click", function(){
                        this.loader.hide();
                    }.bind(this));
                */
                        this.loader.showing = true;
                        if (typeof content == 'undefined') {
                            content = 'Loading...';
                        }
                    }
                    return this.loader.update(content);
                }.bind(this),
                /**
         * Update the currently displayed loader and ensure the new content is positioned correctly.
         * @param {string} content The text to display (as raw HTML). If not a string, will be ignored.
         * @param {number} [percent] A number from 1-100. If a value is specified, it will stop all animations
         *   in progress.
         */
                update: function (content, percent) {
                    if (!this.loader.showing) {
                        return this.loader;
                    }
                    clearTimeout(this.loader.hide_delay);
                    // Apply content if provided
                    if (typeof content == 'string') {
                        this.loader.content_selector.html(content);
                    }
                    // Update size and position
                    var padding = 6;
                    // is there a better place to store/define this?
                    var page_origin = this.getPageOrigin();
                    var loader_boundrect = this.loader.selector.node().getBoundingClientRect();
                    this.loader.selector.style({
                        top: page_origin.y + this.layout.height - loader_boundrect.height - padding + 'px',
                        left: page_origin.x + padding + 'px'
                    });
                    /* Uncomment this code when a functional cancel button can be shown
            var cancel_boundrect = this.loader.cancel_selector.node().getBoundingClientRect();
            this.loader.content_selector.style({
                "padding-right": (cancel_boundrect.width + padding) + "px"
            });
            */
                    // Apply percent if provided
                    if (typeof percent == 'number') {
                        this.loader.progress_selector.style({ width: Math.min(Math.max(percent, 1), 100) + '%' });
                    }
                    return this.loader;
                }.bind(this),
                /**
         * Adds a class to the loading bar that makes it loop infinitely in a loading animation. Useful when exact
         *   percent progress is not available.
         */
                animate: function () {
                    this.loader.progress_selector.classed('lz-loader-progress-animated', true);
                    return this.loader;
                }.bind(this),
                /**
         *  Sets the loading bar in the loader to percentage width equal to the percent (number) value passed. Percents
         *    will automatically be limited to a range of 1 to 100. Will stop all animations in progress.
         */
                setPercentCompleted: function (percent) {
                    this.loader.progress_selector.classed('lz-loader-progress-animated', false);
                    return this.loader.update(null, percent);
                }.bind(this),
                /**
         * Remove the loader
         * @param {number} delay Time to wait (in ms)
         */
                hide: function (delay) {
                    if (!this.loader.showing) {
                        return this.loader;
                    }
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
        LocusZoom.subclass = function (parent, extra) {
            if (typeof parent !== 'function') {
                throw 'Parent must be a callable constructor';
            }
            extra = extra || {};
            var Sub = extra.hasOwnProperty('constructor') ? extra.constructor : function () {
                parent.apply(this, arguments);
            };
            Sub.prototype = Object.create(parent.prototype);
            Object.keys(extra).forEach(function (k) {
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
        /* global LocusZoom */
        'use strict';
        var LZ_SIG_THRESHOLD_LOGP = 7.301;
        // -log10(.05/1e6)
        /**
 * Manage known layouts for all parts of the LocusZoom plot
 *
 * This registry allows for layouts to be reused and customized many times on a page, using a common base pattern.
 *   It handles the work of ensuring that each new instance of the layout has no shared state with other copies.
 *
 * @class
 */
        LocusZoom.Layouts = function () {
            var obj = {};
            var layouts = {
                'plot': {},
                'panel': {},
                'data_layer': {},
                'dashboard': {},
                'tooltip': {}
            };
            /**
     * Generate a layout configuration object
     * @param {('plot'|'panel'|'data_layer'|'dashboard'|'tooltip')} type The type of layout to retrieve
     * @param {string} name Identifier of the predefined layout within the specified type
     * @param {object} [modifications] Custom properties that override default settings for this layout
     * @returns {object} A JSON-serializable object representation
     */
            obj.get = function (type, name, modifications) {
                if (typeof type != 'string' || typeof name != 'string') {
                    throw 'invalid arguments passed to LocusZoom.Layouts.get, requires string (layout type) and string (layout name)';
                } else if (layouts[type][name]) {
                    // Get the base layout
                    var layout = LocusZoom.Layouts.merge(modifications || {}, layouts[type][name]);
                    // If "unnamespaced" is true then strike that from the layout and return the layout without namespacing
                    if (layout.unnamespaced) {
                        delete layout.unnamespaced;
                        return JSON.parse(JSON.stringify(layout));
                    }
                    // Determine the default namespace for namespaced values
                    var default_namespace = '';
                    if (typeof layout.namespace == 'string') {
                        default_namespace = layout.namespace;
                    } else if (typeof layout.namespace == 'object' && Object.keys(layout.namespace).length) {
                        if (typeof layout.namespace.default != 'undefined') {
                            default_namespace = layout.namespace.default;
                        } else {
                            default_namespace = layout.namespace[Object.keys(layout.namespace)[0]].toString();
                        }
                    }
                    default_namespace += default_namespace.length ? ':' : '';
                    // Apply namespaces to layout, recursively
                    var applyNamespaces = function (element, namespace) {
                        if (namespace) {
                            if (typeof namespace == 'string') {
                                namespace = { default: namespace };
                            }
                        } else {
                            namespace = { default: '' };
                        }
                        if (typeof element == 'string') {
                            var re = /\{\{namespace(\[[A-Za-z_0-9]+\]|)\}\}/g;
                            var match, base, key, resolved_namespace;
                            var replace = [];
                            while ((match = re.exec(element)) !== null) {
                                base = match[0];
                                key = match[1].length ? match[1].replace(/(\[|\])/g, '') : null;
                                resolved_namespace = default_namespace;
                                if (namespace != null && typeof namespace == 'object' && typeof namespace[key] != 'undefined') {
                                    resolved_namespace = namespace[key] + (namespace[key].length ? ':' : '');
                                }
                                replace.push({
                                    base: base,
                                    namespace: resolved_namespace
                                });
                            }
                            for (var r in replace) {
                                element = element.replace(replace[r].base, replace[r].namespace);
                            }
                        } else if (typeof element == 'object' && element != null) {
                            if (typeof element.namespace != 'undefined') {
                                var merge_namespace = typeof element.namespace == 'string' ? { default: element.namespace } : element.namespace;
                                namespace = LocusZoom.Layouts.merge(namespace, merge_namespace);
                            }
                            var namespaced_element, namespaced_property;
                            for (var property in element) {
                                if (property === 'namespace') {
                                    continue;
                                }
                                namespaced_element = applyNamespaces(element[property], namespace);
                                namespaced_property = applyNamespaces(property, namespace);
                                if (property !== namespaced_property) {
                                    delete element[property];
                                }
                                element[namespaced_property] = namespaced_element;
                            }
                        }
                        return element;
                    };
                    layout = applyNamespaces(layout, layout.namespace);
                    // Return the layout as valid JSON only
                    return JSON.parse(JSON.stringify(layout));
                } else {
                    throw 'layout type [' + type + '] name [' + name + '] not found';
                }
            };
            /** @private */
            obj.set = function (type, name, layout) {
                if (typeof type != 'string' || typeof name != 'string' || typeof layout != 'object') {
                    throw 'unable to set new layout; bad arguments passed to set()';
                }
                if (!layouts[type]) {
                    layouts[type] = {};
                }
                if (layout) {
                    return layouts[type][name] = JSON.parse(JSON.stringify(layout));
                } else {
                    delete layouts[type][name];
                    return null;
                }
            };
            /**
     * Register a new layout definition by name.
     *
     * @param {string} type The type of layout to add. Usually, this will be one of the predefined LocusZoom types,
     *   but if you pass a different name, this method will automatically create the new `type` bucket
     * @param {string} name The identifier of the newly added layout
     * @param {object} [layout] A JSON-serializable object containing configuration properties for this layout
     * @returns The JSON representation of the newly created layout
     */
            obj.add = function (type, name, layout) {
                return obj.set(type, name, layout);
            };
            /**
     * List all registered layouts
     * @param [type] Optionally narrow the list to only layouts of a specific type; else return all known layouts
     * @returns {*}
     */
            obj.list = function (type) {
                if (!layouts[type]) {
                    var list = {};
                    Object.keys(layouts).forEach(function (type) {
                        list[type] = Object.keys(layouts[type]);
                    });
                    return list;
                } else {
                    return Object.keys(layouts[type]);
                }
            };
            /**
     * A helper method used for merging two objects. If a key is present in both, takes the value from the first object
     *   Values from `default_layout` will be cleanly copied over, ensuring no references or shared state.
     *
     * Frequently used for preparing custom layouts. Both objects should be JSON-serializable.
     *
     * @param {object} custom_layout An object containing configuration parameters that override or add to defaults
     * @param {object} default_layout An object containing default settings.
     * @returns {object} The custom layout is modified in place and also returned from this method.
     */
            obj.merge = function (custom_layout, default_layout) {
                if (typeof custom_layout !== 'object' || typeof default_layout !== 'object') {
                    throw 'LocusZoom.Layouts.merge only accepts two layout objects; ' + typeof custom_layout + ', ' + typeof default_layout + ' given';
                }
                for (var property in default_layout) {
                    if (!default_layout.hasOwnProperty(property)) {
                        continue;
                    }
                    // Get types for comparison. Treat nulls in the custom layout as undefined for simplicity.
                    // (javascript treats nulls as "object" when we just want to overwrite them as if they're undefined)
                    // Also separate arrays from objects as a discrete type.
                    var custom_type = custom_layout[property] === null ? 'undefined' : typeof custom_layout[property];
                    var default_type = typeof default_layout[property];
                    if (custom_type === 'object' && Array.isArray(custom_layout[property])) {
                        custom_type = 'array';
                    }
                    if (default_type === 'object' && Array.isArray(default_layout[property])) {
                        default_type = 'array';
                    }
                    // Unsupported property types: throw an exception
                    if (custom_type === 'function' || default_type === 'function') {
                        throw 'LocusZoom.Layouts.merge encountered an unsupported property type';
                    }
                    // Undefined custom value: pull the default value
                    if (custom_type === 'undefined') {
                        custom_layout[property] = JSON.parse(JSON.stringify(default_layout[property]));
                        continue;
                    }
                    // Both values are objects: merge recursively
                    if (custom_type === 'object' && default_type === 'object') {
                        custom_layout[property] = LocusZoom.Layouts.merge(custom_layout[property], default_layout[property]);
                        continue;
                    }
                }
                return custom_layout;
            };
            return obj;
        }();
        /**
 * Tooltip Layouts
 * @namespace LocusZoom.Layouts.tooltips
 */
        LocusZoom.Layouts.add('tooltip', 'standard_association', {
            namespace: { 'assoc': 'assoc' },
            closable: true,
            show: {
                or: [
                    'highlighted',
                    'selected'
                ]
            },
            hide: {
                and: [
                    'unhighlighted',
                    'unselected'
                ]
            },
            html: '<strong>{{{{namespace[assoc]}}variant}}</strong><br>' + 'P Value: <strong>{{{{namespace[assoc]}}log_pvalue|logtoscinotation}}</strong><br>' + 'Ref. Allele: <strong>{{{{namespace[assoc]}}ref_allele}}</strong><br>' + '<a href="javascript:void(0);" onclick="LocusZoom.getToolTipDataLayer(this).makeLDReference(LocusZoom.getToolTipData(this));">Make LD Reference</a><br>'
        });
        LocusZoom.Layouts.add('tooltip', 'covariates_model_association', function () {
            var covariates_model_association = LocusZoom.Layouts.get('tooltip', 'standard_association', { unnamespaced: true });
            covariates_model_association.html += '<a href="javascript:void(0);" onclick="LocusZoom.getToolTipPlot(this).CovariatesModel.add(LocusZoom.getToolTipData(this));">Condition on Variant</a><br>';
            return covariates_model_association;
        }());
        LocusZoom.Layouts.add('tooltip', 'standard_genes', {
            closable: true,
            show: {
                or: [
                    'highlighted',
                    'selected'
                ]
            },
            hide: {
                and: [
                    'unhighlighted',
                    'unselected'
                ]
            },
            html: '<h4><strong><i>{{gene_name}}</i></strong></h4>' + '<div style="float: left;">Gene ID: <strong>{{gene_id}}</strong></div>' + '<div style="float: right;">Transcript ID: <strong>{{transcript_id}}</strong></div>' + '<div style="clear: both;"></div>' + '<table>' + '<tr><th>Constraint</th><th>Expected variants</th><th>Observed variants</th><th>Const. Metric</th></tr>' + '<tr><td>Synonymous</td><td>{{exp_syn}}</td><td>{{n_syn}}</td><td>z = {{syn_z}}</td></tr>' + '<tr><td>Missense</td><td>{{exp_mis}}</td><td>{{n_mis}}</td><td>z = {{mis_z}}</td></tr>' + '<tr><td>LoF</td><td>{{exp_lof}}</td><td>{{n_lof}}</td><td>pLI = {{pLI}}</td></tr>' + '</table>' + '<a href="http://exac.broadinstitute.org/gene/{{gene_id}}" target="_new">More data on ExAC</a>'
        });
        LocusZoom.Layouts.add('tooltip', 'standard_intervals', {
            namespace: { 'intervals': 'intervals' },
            closable: false,
            show: {
                or: [
                    'highlighted',
                    'selected'
                ]
            },
            hide: {
                and: [
                    'unhighlighted',
                    'unselected'
                ]
            },
            html: '{{{{namespace[intervals]}}state_name}}<br>{{{{namespace[intervals]}}start}}-{{{{namespace[intervals]}}end}}'
        });
        LocusZoom.Layouts.add('tooltip', 'catalog_variant', {
            namespace: {
                'assoc': 'assoc',
                'catalog': 'catalog'
            },
            closable: true,
            show: {
                or: [
                    'highlighted',
                    'selected'
                ]
            },
            hide: {
                and: [
                    'unhighlighted',
                    'unselected'
                ]
            },
            html: '<strong>{{{{namespace[catalog]}}variant|htmlescape}}</strong><br>' + 'Catalog entries: <strong>{{n_catalog_matches}}</strong><br>' + 'Top Trait: <strong>{{{{namespace[catalog]}}trait|htmlescape}}</strong><br>' + 'Top P Value: <strong>{{{{namespace[catalog]}}log_pvalue|logtoscinotation}}</strong><br>'    // User note: if a different catalog is used, the tooltip will need to be replaced with a different link URL
+ 'More: <a href="https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid}}" target="_new">GWAS catalog</a> / <a href="https://www.ncbi.nlm.nih.gov/snp/{{{{namespace[catalog]}}rsid}}" target="_new">dbSNP</a>'
        });
        /**
 * Data Layer Layouts: represent specific information from a data source
 * @namespace Layouts.data_layer
 */
        LocusZoom.Layouts.add('data_layer', 'significance', {
            id: 'significance',
            type: 'orthogonal_line',
            orientation: 'horizontal',
            offset: LZ_SIG_THRESHOLD_LOGP
        });
        LocusZoom.Layouts.add('data_layer', 'recomb_rate', {
            namespace: { 'recomb': 'recomb' },
            id: 'recombrate',
            type: 'line',
            fields: [
                '{{namespace[recomb]}}position',
                '{{namespace[recomb]}}recomb_rate'
            ],
            z_index: 1,
            style: {
                'stroke': '#0000FF',
                'stroke-width': '1.5px'
            },
            x_axis: { field: '{{namespace[recomb]}}position' },
            y_axis: {
                axis: 2,
                field: '{{namespace[recomb]}}recomb_rate',
                floor: 0,
                ceiling: 100
            }
        });
        LocusZoom.Layouts.add('data_layer', 'association_pvalues', {
            namespace: {
                'assoc': 'assoc',
                'ld': 'ld'
            },
            id: 'associationpvalues',
            type: 'scatter',
            point_shape: {
                scale_function: 'if',
                field: '{{namespace[ld]}}isrefvar',
                parameters: {
                    field_value: 1,
                    then: 'diamond',
                    else: 'circle'
                }
            },
            point_size: {
                scale_function: 'if',
                field: '{{namespace[ld]}}isrefvar',
                parameters: {
                    field_value: 1,
                    then: 80,
                    else: 40
                }
            },
            color: [
                {
                    scale_function: 'if',
                    field: '{{namespace[ld]}}isrefvar',
                    parameters: {
                        field_value: 1,
                        then: '#9632b8'
                    }
                },
                {
                    scale_function: 'numerical_bin',
                    field: '{{namespace[ld]}}state',
                    parameters: {
                        breaks: [
                            0,
                            0.2,
                            0.4,
                            0.6,
                            0.8
                        ],
                        values: [
                            '#357ebd',
                            '#46b8da',
                            '#5cb85c',
                            '#eea236',
                            '#d43f3a'
                        ]
                    }
                },
                '#B8B8B8'
            ],
            legend: [
                {
                    shape: 'diamond',
                    color: '#9632b8',
                    size: 40,
                    label: 'LD Ref Var',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#d43f3a',
                    size: 40,
                    label: '1.0 > r\xB2 \u2265 0.8',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#eea236',
                    size: 40,
                    label: '0.8 > r\xB2 \u2265 0.6',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#5cb85c',
                    size: 40,
                    label: '0.6 > r\xB2 \u2265 0.4',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#46b8da',
                    size: 40,
                    label: '0.4 > r\xB2 \u2265 0.2',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#357ebd',
                    size: 40,
                    label: '0.2 > r\xB2 \u2265 0.0',
                    class: 'lz-data_layer-scatter'
                },
                {
                    shape: 'circle',
                    color: '#B8B8B8',
                    size: 40,
                    label: 'no r\xB2 data',
                    class: 'lz-data_layer-scatter'
                }
            ],
            label: null,
            fields: [
                '{{namespace[assoc]}}variant',
                '{{namespace[assoc]}}position',
                '{{namespace[assoc]}}log_pvalue',
                '{{namespace[assoc]}}log_pvalue|logtoscinotation',
                '{{namespace[assoc]}}ref_allele',
                '{{namespace[ld]}}state',
                '{{namespace[ld]}}isrefvar'
            ],
            id_field: '{{namespace[assoc]}}variant',
            z_index: 2,
            x_axis: { field: '{{namespace[assoc]}}position' },
            y_axis: {
                axis: 1,
                field: '{{namespace[assoc]}}log_pvalue',
                floor: 0,
                upper_buffer: 0.1,
                min_extent: [
                    0,
                    10
                ]
            },
            behaviors: {
                onmouseover: [{
                        action: 'set',
                        status: 'highlighted'
                    }],
                onmouseout: [{
                        action: 'unset',
                        status: 'highlighted'
                    }],
                onclick: [{
                        action: 'toggle',
                        status: 'selected',
                        exclusive: true
                    }],
                onshiftclick: [{
                        action: 'toggle',
                        status: 'selected'
                    }]
            },
            tooltip: LocusZoom.Layouts.get('tooltip', 'standard_association', { unnamespaced: true })
        });
        LocusZoom.Layouts.add('data_layer', 'association_pvalues_catalog', function () {
            // Slightly modify an existing layout
            var l = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
                unnamespaced: true,
                id: 'associationpvaluescatalog',
                fill_opacity: 0.7
            });
            l.tooltip.html += '{{#if {{namespace[catalog]}}rsid}}<a href="https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid}}" target="_new">See hits on GWAS catalog</a>{{/if}}';
            l.namespace.catalog = 'catalog';
            l.fields.push('{{namespace[catalog]}}rsid', '{{namespace[catalog]}}trait', '{{namespace[catalog]}}log_pvalue');
            return l;
        }());
        LocusZoom.Layouts.add('data_layer', 'phewas_pvalues', {
            namespace: { 'phewas': 'phewas' },
            id: 'phewaspvalues',
            type: 'category_scatter',
            point_shape: 'circle',
            point_size: 70,
            tooltip_positioning: 'vertical',
            id_field: '{{namespace[phewas]}}id',
            fields: [
                '{{namespace[phewas]}}id',
                '{{namespace[phewas]}}log_pvalue',
                '{{namespace[phewas]}}trait_group',
                '{{namespace[phewas]}}trait_label'
            ],
            x_axis: {
                field: '{{namespace[phewas]}}x',
                // Synthetic/derived field added by `category_scatter` layer
                category_field: '{{namespace[phewas]}}trait_group',
                lower_buffer: 0.025,
                upper_buffer: 0.025
            },
            y_axis: {
                axis: 1,
                field: '{{namespace[phewas]}}log_pvalue',
                floor: 0,
                upper_buffer: 0.15
            },
            color: {
                field: '{{namespace[phewas]}}trait_group',
                scale_function: 'categorical_bin',
                parameters: {
                    categories: [],
                    values: [],
                    null_value: '#B8B8B8'
                }
            },
            fill_opacity: 0.7,
            tooltip: {
                closable: true,
                show: {
                    or: [
                        'highlighted',
                        'selected'
                    ]
                },
                hide: {
                    and: [
                        'unhighlighted',
                        'unselected'
                    ]
                },
                html: [
                    '<strong>Trait:</strong> {{{{namespace[phewas]}}trait_label|htmlescape}}<br>',
                    '<strong>Trait Category:</strong> {{{{namespace[phewas]}}trait_group|htmlescape}}<br>',
                    '<strong>P-value:</strong> {{{{namespace[phewas]}}log_pvalue|logtoscinotation|htmlescape}}<br>'
                ].join('')
            },
            behaviors: {
                onmouseover: [{
                        action: 'set',
                        status: 'highlighted'
                    }],
                onmouseout: [{
                        action: 'unset',
                        status: 'highlighted'
                    }],
                onclick: [{
                        action: 'toggle',
                        status: 'selected',
                        exclusive: true
                    }],
                onshiftclick: [{
                        action: 'toggle',
                        status: 'selected'
                    }]
            },
            label: {
                text: '{{{{namespace[phewas]}}trait_label}}',
                spacing: 6,
                lines: {
                    style: {
                        'stroke-width': '2px',
                        'stroke': '#333333',
                        'stroke-dasharray': '2px 2px'
                    }
                },
                filters: [{
                        field: '{{namespace[phewas]}}log_pvalue',
                        operator: '>=',
                        value: 20
                    }],
                style: {
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'fill': '#333333'
                }
            }
        });
        LocusZoom.Layouts.add('data_layer', 'genes', {
            namespace: {
                'gene': 'gene',
                'constraint': 'constraint'
            },
            id: 'genes',
            type: 'genes',
            fields: [
                '{{namespace[gene]}}all',
                '{{namespace[constraint]}}all'
            ],
            id_field: 'gene_id',
            behaviors: {
                onmouseover: [{
                        action: 'set',
                        status: 'highlighted'
                    }],
                onmouseout: [{
                        action: 'unset',
                        status: 'highlighted'
                    }],
                onclick: [{
                        action: 'toggle',
                        status: 'selected',
                        exclusive: true
                    }],
                onshiftclick: [{
                        action: 'toggle',
                        status: 'selected'
                    }]
            },
            tooltip: LocusZoom.Layouts.get('tooltip', 'standard_genes', { unnamespaced: true })
        });
        LocusZoom.Layouts.add('data_layer', 'genome_legend', {
            namespace: { 'genome': 'genome' },
            id: 'genome_legend',
            type: 'genome_legend',
            fields: [
                '{{namespace[genome]}}chr',
                '{{namespace[genome]}}base_pairs'
            ],
            x_axis: {
                floor: 0,
                ceiling: 2881033286
            }
        });
        LocusZoom.Layouts.add('data_layer', 'intervals', {
            namespace: { 'intervals': 'intervals' },
            id: 'intervals',
            type: 'intervals',
            fields: [
                '{{namespace[intervals]}}start',
                '{{namespace[intervals]}}end',
                '{{namespace[intervals]}}state_id',
                '{{namespace[intervals]}}state_name'
            ],
            id_field: '{{namespace[intervals]}}start',
            start_field: '{{namespace[intervals]}}start',
            end_field: '{{namespace[intervals]}}end',
            track_split_field: '{{namespace[intervals]}}state_id',
            split_tracks: true,
            always_hide_legend: false,
            color: {
                field: '{{namespace[intervals]}}state_id',
                scale_function: 'categorical_bin',
                parameters: {
                    categories: [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12,
                        13
                    ],
                    values: [
                        'rgb(212,63,58)',
                        'rgb(250,120,105)',
                        'rgb(252,168,139)',
                        'rgb(240,189,66)',
                        'rgb(250,224,105)',
                        'rgb(240,238,84)',
                        'rgb(244,252,23)',
                        'rgb(23,232,252)',
                        'rgb(32,191,17)',
                        'rgb(23,166,77)',
                        'rgb(32,191,17)',
                        'rgb(162,133,166)',
                        'rgb(212,212,212)'
                    ],
                    null_value: '#B8B8B8'
                }
            },
            legend: [
                {
                    shape: 'rect',
                    color: 'rgb(212,63,58)',
                    width: 9,
                    label: 'Active Promoter',
                    '{{namespace[intervals]}}state_id': 1
                },
                {
                    shape: 'rect',
                    color: 'rgb(250,120,105)',
                    width: 9,
                    label: 'Weak Promoter',
                    '{{namespace[intervals]}}state_id': 2
                },
                {
                    shape: 'rect',
                    color: 'rgb(252,168,139)',
                    width: 9,
                    label: 'Poised Promoter',
                    '{{namespace[intervals]}}state_id': 3
                },
                {
                    shape: 'rect',
                    color: 'rgb(240,189,66)',
                    width: 9,
                    label: 'Strong enhancer',
                    '{{namespace[intervals]}}state_id': 4
                },
                {
                    shape: 'rect',
                    color: 'rgb(250,224,105)',
                    width: 9,
                    label: 'Strong enhancer',
                    '{{namespace[intervals]}}state_id': 5
                },
                {
                    shape: 'rect',
                    color: 'rgb(240,238,84)',
                    width: 9,
                    label: 'Weak enhancer',
                    '{{namespace[intervals]}}state_id': 6
                },
                {
                    shape: 'rect',
                    color: 'rgb(244,252,23)',
                    width: 9,
                    label: 'Weak enhancer',
                    '{{namespace[intervals]}}state_id': 7
                },
                {
                    shape: 'rect',
                    color: 'rgb(23,232,252)',
                    width: 9,
                    label: 'Insulator',
                    '{{namespace[intervals]}}state_id': 8
                },
                {
                    shape: 'rect',
                    color: 'rgb(32,191,17)',
                    width: 9,
                    label: 'Transcriptional transition',
                    '{{namespace[intervals]}}state_id': 9
                },
                {
                    shape: 'rect',
                    color: 'rgb(23,166,77)',
                    width: 9,
                    label: 'Transcriptional elongation',
                    '{{namespace[intervals]}}state_id': 10
                },
                {
                    shape: 'rect',
                    color: 'rgb(136,240,129)',
                    width: 9,
                    label: 'Weak transcribed',
                    '{{namespace[intervals]}}state_id': 11
                },
                {
                    shape: 'rect',
                    color: 'rgb(162,133,166)',
                    width: 9,
                    label: 'Polycomb-repressed',
                    '{{namespace[intervals]}}state_id': 12
                },
                {
                    shape: 'rect',
                    color: 'rgb(212,212,212)',
                    width: 9,
                    label: 'Heterochromatin / low signal',
                    '{{namespace[intervals]}}state_id': 13
                }
            ],
            behaviors: {
                onmouseover: [{
                        action: 'set',
                        status: 'highlighted'
                    }],
                onmouseout: [{
                        action: 'unset',
                        status: 'highlighted'
                    }],
                onclick: [{
                        action: 'toggle',
                        status: 'selected',
                        exclusive: true
                    }],
                onshiftclick: [{
                        action: 'toggle',
                        status: 'selected'
                    }]
            },
            tooltip: LocusZoom.Layouts.get('tooltip', 'standard_intervals', { unnamespaced: true })
        });
        LocusZoom.Layouts.add('data_layer', 'annotation_catalog', {
            // Identify GWAS hits that are present in the GWAS catalog
            namespace: {
                'assoc': 'assoc',
                'catalog': 'catalog'
            },
            id: 'annotation_catalog',
            type: 'annotation_track',
            id_field: '{{namespace[catalog]}}variant',
            x_axis: { field: '{{namespace[assoc]}}position' },
            color: '#0000CC',
            fields: [
                '{{namespace[assoc]}}variant',
                '{{namespace[assoc]}}chromosome',
                '{{namespace[assoc]}}position',
                '{{namespace[catalog]}}variant',
                '{{namespace[catalog]}}rsid',
                '{{namespace[catalog]}}trait',
                '{{namespace[catalog]}}log_pvalue'
            ],
            filters: [
                // Specify which points to show on the track. Any selection must satisfy ALL filters
                [
                    '{{namespace[catalog]}}rsid',
                    '!=',
                    null
                ],
                [
                    '{{namespace[catalog]}}log_pvalue',
                    '>',
                    LZ_SIG_THRESHOLD_LOGP
                ]
            ],
            behaviors: {
                onmouseover: [{
                        action: 'set',
                        status: 'highlighted'
                    }],
                onmouseout: [{
                        action: 'unset',
                        status: 'highlighted'
                    }],
                onclick: [{
                        action: 'toggle',
                        status: 'selected',
                        exclusive: true
                    }],
                onshiftclick: [{
                        action: 'toggle',
                        status: 'selected'
                    }]
            },
            tooltip: LocusZoom.Layouts.get('tooltip', 'catalog_variant', { unnamespaced: true }),
            tooltip_positioning: 'vertical'
        });
        /**
 * Dashboard Layouts: toolbar buttons etc
 * @namespace Layouts.dashboard
 */
        LocusZoom.Layouts.add('dashboard', 'standard_panel', {
            components: [
                {
                    type: 'remove_panel',
                    position: 'right',
                    color: 'red',
                    group_position: 'end'
                },
                {
                    type: 'move_panel_up',
                    position: 'right',
                    group_position: 'middle'
                },
                {
                    type: 'move_panel_down',
                    position: 'right',
                    group_position: 'start',
                    style: { 'margin-left': '0.75em' }
                }
            ]
        });
        LocusZoom.Layouts.add('dashboard', 'standard_plot', {
            components: [
                {
                    type: 'title',
                    title: 'LocusZoom',
                    subtitle: '<a href="https://statgen.github.io/locuszoom/" target="_blank">v' + LocusZoom.version + '</a>',
                    position: 'left'
                },
                {
                    type: 'download',
                    position: 'right'
                }
            ]
        });
        LocusZoom.Layouts.add('dashboard', 'covariates_model_plot', function () {
            var covariates_model_plot_dashboard = LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true });
            covariates_model_plot_dashboard.components.push({
                type: 'covariates_model',
                button_html: 'Model',
                button_title: 'Show and edit covariates currently in model',
                position: 'left'
            });
            return covariates_model_plot_dashboard;
        }());
        LocusZoom.Layouts.add('dashboard', 'region_nav_plot', function () {
            var region_nav_plot_dashboard = LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true });
            region_nav_plot_dashboard.components.push({
                type: 'shift_region',
                step: 500000,
                button_html: '>>',
                position: 'right',
                group_position: 'end'
            }, {
                type: 'shift_region',
                step: 50000,
                button_html: '>',
                position: 'right',
                group_position: 'middle'
            }, {
                type: 'zoom_region',
                step: 0.2,
                position: 'right',
                group_position: 'middle'
            }, {
                type: 'zoom_region',
                step: -0.2,
                position: 'right',
                group_position: 'middle'
            }, {
                type: 'shift_region',
                step: -50000,
                button_html: '<',
                position: 'right',
                group_position: 'middle'
            }, {
                type: 'shift_region',
                step: -500000,
                button_html: '<<',
                position: 'right',
                group_position: 'start'
            });
            return region_nav_plot_dashboard;
        }());
        /**
 * Panel Layouts
 * @namespace Layouts.panel
 */
        LocusZoom.Layouts.add('panel', 'association', {
            id: 'association',
            width: 800,
            height: 225,
            min_width: 400,
            min_height: 200,
            proportional_width: 1,
            margin: {
                top: 35,
                right: 50,
                bottom: 40,
                left: 50
            },
            inner_border: 'rgb(210, 210, 210)',
            dashboard: function () {
                var l = LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true });
                l.components.push({
                    type: 'toggle_legend',
                    position: 'right'
                });
                return l;
            }(),
            axes: {
                x: {
                    label: 'Chromosome {{chr}} (Mb)',
                    label_offset: 32,
                    tick_format: 'region',
                    extent: 'state'
                },
                y1: {
                    label: '-log10 p-value',
                    label_offset: 28
                },
                y2: {
                    label: 'Recombination Rate (cM/Mb)',
                    label_offset: 40
                }
            },
            legend: {
                orientation: 'vertical',
                origin: {
                    x: 55,
                    y: 40
                },
                hidden: true
            },
            interaction: {
                drag_background_to_pan: true,
                drag_x_ticks_to_scale: true,
                drag_y1_ticks_to_scale: true,
                drag_y2_ticks_to_scale: true,
                scroll_to_zoom: true,
                x_linked: true
            },
            data_layers: [
                LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true })
            ]
        });
        LocusZoom.Layouts.add('panel', 'association_catalog', function () {
            var l = LocusZoom.Layouts.get('panel', 'association', {
                unnamespaced: true,
                id: 'associationcatalog',
                namespace: {
                    'assoc': 'assoc',
                    'ld': 'ld',
                    'catalog': 'catalog'
                }    // Required to resolve display options
            });
            l.dashboard.components.push({
                type: 'display_options',
                position: 'right',
                color: 'blue',
                // Below: special config specific to this widget
                button_html: 'Display options...',
                button_title: 'Control how plot items are displayed',
                layer_name: 'associationpvaluescatalog',
                default_config_display_name: 'No catalog labels (default)',
                // display name for the default plot color option (allow user to revert to plot defaults)
                options: [{
                        // First dropdown menu item
                        display_name: 'Label catalog traits',
                        // Human readable representation of field name
                        display: {
                            // Specify layout directives that control display of the plot for this option
                            label: {
                                text: '{{{{namespace[catalog]}}trait}}',
                                spacing: 6,
                                lines: {
                                    style: {
                                        'stroke-width': '2px',
                                        'stroke': '#333333',
                                        'stroke-dasharray': '2px 2px'
                                    }
                                },
                                filters: [
                                    // Only label points if they are significant for some trait in the catalog, AND in high LD
                                    //  with the top hit of interest
                                    {
                                        field: '{{namespace[catalog]}}trait',
                                        operator: '!=',
                                        value: null
                                    },
                                    {
                                        field: '{{namespace[catalog]}}log_pvalue',
                                        operator: '>',
                                        value: LZ_SIG_THRESHOLD_LOGP
                                    },
                                    {
                                        field: '{{namespace[ld]}}state',
                                        operator: '>',
                                        value: 0.4
                                    }
                                ],
                                style: {
                                    'font-size': '10px',
                                    'font-weight': 'bold',
                                    'fill': '#333333'
                                }
                            }
                        }
                    }]
            });
            l.data_layers = [
                LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true })
            ];
            return l;
        }());
        LocusZoom.Layouts.add('panel', 'genes', {
            id: 'genes',
            width: 800,
            height: 225,
            min_width: 400,
            min_height: 112.5,
            proportional_width: 1,
            margin: {
                top: 20,
                right: 50,
                bottom: 20,
                left: 50
            },
            axes: {},
            interaction: {
                drag_background_to_pan: true,
                scroll_to_zoom: true,
                x_linked: true
            },
            dashboard: function () {
                var l = LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true });
                l.components.push({
                    type: 'resize_to_data',
                    position: 'right'
                });
                return l;
            }(),
            data_layers: [LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true })]
        });
        LocusZoom.Layouts.add('panel', 'phewas', {
            id: 'phewas',
            width: 800,
            height: 300,
            min_width: 800,
            min_height: 300,
            proportional_width: 1,
            margin: {
                top: 20,
                right: 50,
                bottom: 120,
                left: 50
            },
            inner_border: 'rgb(210, 210, 210)',
            axes: {
                x: {
                    ticks: {
                        // Object based config (shared defaults; allow layers to specify ticks)
                        style: {
                            'font-weight': 'bold',
                            'font-size': '11px',
                            'text-anchor': 'start'
                        },
                        transform: 'rotate(50)',
                        position: 'left'    // Special param recognized by `category_scatter` layers
                    }
                },
                y1: {
                    label: '-log10 p-value',
                    label_offset: 28
                }
            },
            data_layers: [
                LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
                LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true })
            ]
        });
        LocusZoom.Layouts.add('panel', 'genome_legend', {
            id: 'genome_legend',
            width: 800,
            height: 50,
            origin: {
                x: 0,
                y: 300
            },
            min_width: 800,
            min_height: 50,
            proportional_width: 1,
            margin: {
                top: 0,
                right: 50,
                bottom: 35,
                left: 50
            },
            axes: {
                x: {
                    label: 'Genomic Position (number denotes chromosome)',
                    label_offset: 35,
                    ticks: [
                        {
                            x: 124625310,
                            text: '1',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 370850307,
                            text: '2',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 591461209,
                            text: '3',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 786049562,
                            text: '4',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 972084330,
                            text: '5',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1148099493,
                            text: '6',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1313226358,
                            text: '7',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1465977701,
                            text: '8',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1609766427,
                            text: '9',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1748140516,
                            text: '10',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 1883411148,
                            text: '11',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2017840353,
                            text: '12',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2142351240,
                            text: '13',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2253610949,
                            text: '14',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2358551415,
                            text: '15',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2454994487,
                            text: '16',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2540769469,
                            text: '17',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2620405698,
                            text: '18',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2689008813,
                            text: '19',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2750086065,
                            text: '20',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2805663772,
                            text: '21',
                            style: {
                                'fill': 'rgb(120, 120, 186)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        },
                        {
                            x: 2855381003,
                            text: '22',
                            style: {
                                'fill': 'rgb(0, 0, 66)',
                                'text-anchor': 'center',
                                'font-size': '13px',
                                'font-weight': 'bold'
                            },
                            transform: 'translate(0, 2)'
                        }
                    ]
                }
            },
            data_layers: [LocusZoom.Layouts.get('data_layer', 'genome_legend', { unnamespaced: true })]
        });
        LocusZoom.Layouts.add('panel', 'intervals', {
            id: 'intervals',
            width: 1000,
            height: 50,
            min_width: 500,
            min_height: 50,
            margin: {
                top: 25,
                right: 150,
                bottom: 5,
                left: 50
            },
            dashboard: function () {
                var l = LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true });
                l.components.push({
                    type: 'toggle_split_tracks',
                    data_layer_id: 'intervals',
                    position: 'right'
                });
                return l;
            }(),
            axes: {},
            interaction: {
                drag_background_to_pan: true,
                scroll_to_zoom: true,
                x_linked: true
            },
            legend: {
                hidden: true,
                orientation: 'horizontal',
                origin: {
                    x: 50,
                    y: 0
                },
                pad_from_bottom: 5
            },
            data_layers: [LocusZoom.Layouts.get('data_layer', 'intervals', { unnamespaced: true })]
        });
        LocusZoom.Layouts.add('panel', 'annotation_catalog', {
            id: 'annotationcatalog',
            title: {
                text: 'SNPs in GWAS Catalog',
                x: 50,
                style: { 'font-size': '14px' }
            },
            width: 800,
            height: 100,
            min_height: 100,
            proportional_width: 1,
            margin: {
                top: 35,
                right: 50,
                bottom: 40,
                left: 50
            },
            inner_border: 'rgb(210, 210, 210)',
            interaction: {
                drag_background_to_pan: true,
                scroll_to_zoom: true,
                x_linked: true
            },
            data_layers: [LocusZoom.Layouts.get('data_layer', 'annotation_catalog', { unnamespaced: true })]
        });
        /**
 * Plot Layouts
 * @namespace Layouts.plot
 */
        LocusZoom.Layouts.add('plot', 'standard_association', {
            state: {},
            width: 800,
            height: 450,
            responsive_resize: true,
            min_region_scale: 20000,
            max_region_scale: 1000000,
            dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
            panels: [
                LocusZoom.Layouts.get('panel', 'association', {
                    unnamespaced: true,
                    proportional_height: 0.5
                }),
                LocusZoom.Layouts.get('panel', 'genes', {
                    unnamespaced: true,
                    proportional_height: 0.5
                })
            ]
        });
        LocusZoom.Layouts.add('plot', 'association_catalog', {
            state: {},
            width: 800,
            height: 450,
            responsive_resize: true,
            min_region_scale: 20000,
            max_region_scale: 1000000,
            dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
            panels: [
                LocusZoom.Layouts.get('panel', 'association_catalog', {
                    unnamespaced: true,
                    proportional_height: 0.5
                }),
                LocusZoom.Layouts.get('panel', 'annotation_catalog', { unnamespaced: true }),
                LocusZoom.Layouts.get('panel', 'genes', {
                    unnamespaced: true,
                    proportional_height: 0.5
                })
            ]
        });
        // Shortcut to "StandardLayout" for backward compatibility
        LocusZoom.StandardLayout = LocusZoom.Layouts.get('plot', 'standard_association');
        LocusZoom.Layouts.add('plot', 'standard_phewas', {
            width: 800,
            height: 600,
            min_width: 800,
            min_height: 600,
            responsive_resize: true,
            dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
            panels: [
                LocusZoom.Layouts.get('panel', 'phewas', {
                    unnamespaced: true,
                    proportional_height: 0.45
                }),
                LocusZoom.Layouts.get('panel', 'genome_legend', {
                    unnamespaced: true,
                    proportional_height: 0.1
                }),
                LocusZoom.Layouts.get('panel', 'genes', {
                    unnamespaced: true,
                    proportional_height: 0.45,
                    margin: { bottom: 40 },
                    axes: {
                        x: {
                            label: 'Chromosome {{chr}} (Mb)',
                            label_offset: 32,
                            tick_format: 'region',
                            extent: 'state'
                        }
                    }
                })
            ],
            mouse_guide: false
        });
        LocusZoom.Layouts.add('plot', 'interval_association', {
            state: {},
            width: 800,
            height: 550,
            responsive_resize: true,
            min_region_scale: 20000,
            max_region_scale: 1000000,
            dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
            panels: [
                LocusZoom.Layouts.get('panel', 'association', {
                    unnamespaced: true,
                    width: 800,
                    proportional_height: 225 / 570
                }),
                LocusZoom.Layouts.get('panel', 'intervals', {
                    unnamespaced: true,
                    proportional_height: 120 / 570
                }),
                LocusZoom.Layouts.get('panel', 'genes', {
                    unnamespaced: true,
                    width: 800,
                    proportional_height: 225 / 570
                })
            ]
        });
        /* global LocusZoom */
        'use strict';
        /**
 * A data layer is an abstract class representing a data set and its graphical representation within a panel
 * @public
 * @class
 * @param {Object} layout A JSON-serializable object describing the layout for this layer
 * @param {LocusZoom.DataLayer|LocusZoom.Panel} parent Where this layout is used
*/
        LocusZoom.DataLayer = function (layout, parent) {
            /** @member {Boolean} */
            this.initialized = false;
            /** @member {Number} */
            this.layout_idx = null;
            /** @member {String} */
            this.id = null;
            /** @member {LocusZoom.Panel} */
            this.parent = parent || null;
            /**
     * @member {{group: d3.selection, container: d3.selection, clipRect: d3.selection}}
     */
            this.svg = {};
            /** @member {LocusZoom.Plot} */
            this.parent_plot = null;
            if (typeof parent != 'undefined' && parent instanceof LocusZoom.Panel) {
                this.parent_plot = parent.parent;
            }
            /** @member {Object} */
            this.layout = LocusZoom.Layouts.merge(layout || {}, LocusZoom.DataLayer.DefaultLayout);
            if (this.layout.id) {
                this.id = this.layout.id;
            }
            // Ensure any axes defined in the layout have an explicit axis number (default: 1)
            if (this.layout.x_axis !== {} && typeof this.layout.x_axis.axis !== 'number') {
                this.layout.x_axis.axis = 1;
            }
            if (this.layout.y_axis !== {} && typeof this.layout.y_axis.axis !== 'number') {
                this.layout.y_axis.axis = 1;
            }
            /**
     * Values in the layout object may change during rendering etc. Retain a copy of the original data layer state
     * @member {Object}
     */
            this._base_layout = JSON.parse(JSON.stringify(this.layout));
            /** @member {Object} */
            this.state = {};
            /** @member {String} */
            this.state_id = null;
            this.setDefaultState();
            // Initialize parameters for storing data and tool tips
            /** @member {Array} */
            this.data = [];
            if (this.layout.tooltip) {
                /** @member {Object} */
                this.tooltips = {};
            }
            // Initialize flags for tracking global statuses
            this.global_statuses = {
                'highlighted': false,
                'selected': false,
                'faded': false,
                'hidden': false
            };
            return this;
        };
        /**
 * Instruct this datalayer to begin tracking additional fields from data sources (does not guarantee that such a field actually exists)
 *
 * Custom plots can use this to dynamically extend datalayer functionality after the plot is drawn
 *
 *  (since removing core fields may break layer functionality, there is presently no hook for the inverse behavior)
 * @param fieldName
 * @param namespace
 * @param {String|String[]} transformations The name (or array of names) of transformations to apply to this field
 * @returns {String} The raw string added to the fields array
 */
        LocusZoom.DataLayer.prototype.addField = function (fieldName, namespace, transformations) {
            if (!fieldName || !namespace) {
                throw 'Must specify field name and namespace to use when adding field';
            }
            var fieldString = namespace + ':' + fieldName;
            if (transformations) {
                fieldString += '|';
                if (typeof transformations === 'string') {
                    fieldString += transformations;
                } else if (Array.isArray(transformations)) {
                    fieldString += transformations.join('|');
                } else {
                    throw 'Must provide transformations as either a string or array of strings';
                }
            }
            var fields = this.layout.fields;
            if (fields.indexOf(fieldString) === -1) {
                fields.push(fieldString);
            }
            return fieldString;
        };
        /**
 * Define default state that should get tracked during the lifetime of this layer.
 *
 * In some special custom usages, it may be useful to completely reset a panel (eg "click for
 *   genome region" links), plotting new data that invalidates any previously tracked state.  This hook makes it
 *   possible to reset without destroying the panel entirely. It is used by `Plot.clearPanelData`.
 */
        LocusZoom.DataLayer.prototype.setDefaultState = function () {
            // Define state parameters specific to this data layer. Within plot state, this will live under a key
            //  `panel_name.layer_name`.
            if (this.parent) {
                this.state = this.parent.state;
                this.state_id = this.parent.id + '.' + this.id;
                this.state[this.state_id] = this.state[this.state_id] || {};
                LocusZoom.DataLayer.Statuses.adjectives.forEach(function (status) {
                    this.state[this.state_id][status] = this.state[this.state_id][status] || [];
                }.bind(this));
            }
        };
        /**
 * A basic description of keys expected in a layout. Not intended to be directly used or modified by an end user.
 * @protected
 * @type {{type: string, fields: Array, x_axis: {}, y_axis: {}}}
 */
        LocusZoom.DataLayer.DefaultLayout = {
            type: '',
            fields: [],
            x_axis: {},
            y_axis: {}
        };
        /**
 * Available statuses that individual elements can have. Each status is described by
 *   a verb/antiverb and an adjective. Verbs and antiverbs are used to generate data layer
 *   methods for updating the status on one or more elements. Adjectives are used in class
 *   names and applied or removed from elements to have a visual representation of the status,
 *   as well as used as keys in the state for tracking which elements are in which status(es)
 * @static
 * @type {{verbs: String[], adjectives: String[], menu_antiverbs: String[]}}
 */
        LocusZoom.DataLayer.Statuses = {
            verbs: [
                'highlight',
                'select',
                'fade',
                'hide'
            ],
            adjectives: [
                'highlighted',
                'selected',
                'faded',
                'hidden'
            ],
            menu_antiverbs: [
                'unhighlight',
                'deselect',
                'unfade',
                'show'
            ]
        };
        /**
 * Get the fully qualified identifier for the data layer, prefixed by any parent or container elements
 *
 * @returns {string} A dot-delimited string of the format <plot>.<panel>.<data_layer>
 */
        LocusZoom.DataLayer.prototype.getBaseId = function () {
            return this.parent_plot.id + '.' + this.parent.id + '.' + this.id;
        };
        /**
 * Determine the pixel height of data-bound objects represented inside this data layer. (excluding elements such as axes)
 *
 * May be used by operations that resize the data layer to fit available data
 *
 * @public
 * @returns {number}
 */
        LocusZoom.DataLayer.prototype.getAbsoluteDataHeight = function () {
            var dataBCR = this.svg.group.node().getBoundingClientRect();
            return dataBCR.height;
        };
        /**
 * Whether transitions can be applied to this data layer
 * @returns {boolean}
 */
        LocusZoom.DataLayer.prototype.canTransition = function () {
            if (!this.layout.transition) {
                return false;
            }
            return !(this.parent_plot.panel_boundaries.dragging || this.parent_plot.interaction.panel_id);
        };
        /**
 * Fetch the fully qualified ID to be associated with a specific visual element, based on the data to which that
 *   element is bound. In general this element ID will be unique, allowing it to be addressed directly via selectors.
 * @param {String|Object} element
 * @returns {String}
 */
        LocusZoom.DataLayer.prototype.getElementId = function (element) {
            var element_id = 'element';
            if (typeof element == 'string') {
                element_id = element;
            } else if (typeof element == 'object') {
                var id_field = this.layout.id_field || 'id';
                if (typeof element[id_field] == 'undefined') {
                    throw 'Unable to generate element ID';
                }
                element_id = element[id_field].toString().replace(/\W/g, '');
            }
            return (this.getBaseId() + '-' + element_id).replace(/([:.[\],])/g, '_');
        };
        /**
 * Fetch an ID that may bind a data element to a separate visual node for displaying status
 * Examples of this might be seperate visual nodes to show select/highlight statuses, or
 * even a common/shared node to show status across many elements in a set.
 * Abstract method. It should be overridden by data layers that implement seperate status
 * nodes specifically to the use case of the data layer type.
 * @param {String|Object} element
 * @returns {String|null}
 */
        LocusZoom.DataLayer.prototype.getElementStatusNodeId = function (element) {
            return null;
        };
        /**
 * Returns a reference to the underlying data associated with a single visual element in the data layer, as
 *   referenced by the unique identifier for the element

 * @param {String} id The unique identifier for the element, as defined by `getElementId`
 * @returns {Object|null} The data bound to that element
 */
        LocusZoom.DataLayer.prototype.getElementById = function (id) {
            var selector = d3.select('#' + id.replace(/([:.[\],])/g, '\\$1'));
            // escape special characters
            if (!selector.empty() && selector.data() && selector.data().length) {
                return selector.data()[0];
            } else {
                return null;
            }
        };
        /**
 * Basic method to apply arbitrary methods and properties to data elements.
 *   This is called on all data immediately after being fetched.
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.applyDataMethods = function () {
            this.data.forEach(function (d, i) {
                // Basic toHTML() method - return the stringified value in the id_field, if defined.
                this.data[i].toHTML = function () {
                    var id_field = this.layout.id_field || 'id';
                    var html = '';
                    if (this.data[i][id_field]) {
                        html = this.data[i][id_field].toString();
                    }
                    return html;
                }.bind(this);
                // getDataLayer() method - return a reference to the data layer
                this.data[i].getDataLayer = function () {
                    return this;
                }.bind(this);
                // deselect() method - shortcut method to deselect the element
                this.data[i].deselect = function () {
                    var data_layer = this.getDataLayer();
                    data_layer.unselectElement(this);
                };
            }.bind(this));
            this.applyCustomDataMethods();
            return this;
        };
        /**
 * Hook that allows custom datalayers to apply additional methods and properties to data elements as needed
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.applyCustomDataMethods = function () {
            return this;
        };
        /**
 * Initialize a data layer
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.initialize = function () {
            // Append a container group element to house the main data layer group element and the clip path
            this.svg.container = this.parent.svg.group.append('g').attr('class', 'lz-data_layer-container').attr('id', this.getBaseId() + '.data_layer_container');
            // Append clip path to the container element
            this.svg.clipRect = this.svg.container.append('clipPath').attr('id', this.getBaseId() + '.clip').append('rect');
            // Append svg group for rendering all data layer elements, clipped by the clip path
            this.svg.group = this.svg.container.append('g').attr('id', this.getBaseId() + '.data_layer').attr('clip-path', 'url(#' + this.getBaseId() + '.clip)');
            return this;
        };
        /**
 * Move a data layer up relative to others by z-index
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.moveUp = function () {
            if (this.parent.data_layer_ids_by_z_index[this.layout.z_index + 1]) {
                this.parent.data_layer_ids_by_z_index[this.layout.z_index] = this.parent.data_layer_ids_by_z_index[this.layout.z_index + 1];
                this.parent.data_layer_ids_by_z_index[this.layout.z_index + 1] = this.id;
                this.parent.resortDataLayers();
            }
            return this;
        };
        /**
 * Move a data layer down relative to others by z-index
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.moveDown = function () {
            if (this.parent.data_layer_ids_by_z_index[this.layout.z_index - 1]) {
                this.parent.data_layer_ids_by_z_index[this.layout.z_index] = this.parent.data_layer_ids_by_z_index[this.layout.z_index - 1];
                this.parent.data_layer_ids_by_z_index[this.layout.z_index - 1] = this.id;
                this.parent.resortDataLayers();
            }
            return this;
        };
        /**
 * Apply scaling functions to an element or parameter as needed, based on its layout and the element's data
 * If the layout parameter is already a primitive type, simply return the value as given
 * @param {Array|Number|String|Object} layout
 * @param {*} data The value to be used with the filter
 * @returns {*} The transformed value
 */
        LocusZoom.DataLayer.prototype.resolveScalableParameter = function (layout, data) {
            var ret = null;
            if (Array.isArray(layout)) {
                var idx = 0;
                while (ret === null && idx < layout.length) {
                    ret = this.resolveScalableParameter(layout[idx], data);
                    idx++;
                }
            } else {
                switch (typeof layout) {
                case 'number':
                case 'string':
                    ret = layout;
                    break;
                case 'object':
                    if (layout.scale_function) {
                        if (layout.field) {
                            var f = new LocusZoom.Data.Field(layout.field);
                            ret = LocusZoom.ScaleFunctions.get(layout.scale_function, layout.parameters || {}, f.resolve(data));
                        } else {
                            ret = LocusZoom.ScaleFunctions.get(layout.scale_function, layout.parameters || {}, data);
                        }
                    }
                    break;
                }
            }
            return ret;
        };
        /**
 * Implementation hook for fetching the min and max values of available data. Used to determine axis range, if no other
 *   explicit axis settings override. Useful for data layers where the data extent depends on more than one field.
 *   (eg confidence intervals in a forest plot)
 * @param data
 * @param axis_config The configuration object for the specified axis.
 * @returns {Array} [min, max] without any padding applied
 * @private
 */
        LocusZoom.DataLayer.prototype._getDataExtent = function (data, axis_config) {
            data = data || this.data;
            // By default this depends only on a single field.
            return d3.extent(data, function (d) {
                var f = new LocusZoom.Data.Field(axis_config.field);
                return +f.resolve(d);
            });
        };
        /**
 * Generate dimension extent function based on layout parameters
 * @param {('x'|'y')} dimension
 */
        LocusZoom.DataLayer.prototype.getAxisExtent = function (dimension) {
            if ([
                    'x',
                    'y'
                ].indexOf(dimension) === -1) {
                throw 'Invalid dimension identifier passed to LocusZoom.DataLayer.getAxisExtent()';
            }
            var axis_name = dimension + '_axis';
            var axis_layout = this.layout[axis_name];
            // If a floor AND a ceiling are explicitly defined then just return that extent and be done
            if (!isNaN(axis_layout.floor) && !isNaN(axis_layout.ceiling)) {
                return [
                    +axis_layout.floor,
                    +axis_layout.ceiling
                ];
            }
            // If a field is defined for the axis and the data layer has data then generate the extent from the data set
            var data_extent = [];
            if (axis_layout.field && this.data) {
                if (!this.data.length) {
                    // If data has been fetched (but no points in region), enforce the min_extent (with no buffers,
                    //  because we don't need padding around an empty screen)
                    data_extent = axis_layout.min_extent || [];
                    return data_extent;
                } else {
                    data_extent = this._getDataExtent(this.data, axis_layout);
                    // Apply upper/lower buffers, if applicable
                    var original_extent_span = data_extent[1] - data_extent[0];
                    if (!isNaN(axis_layout.lower_buffer)) {
                        data_extent[0] -= original_extent_span * axis_layout.lower_buffer;
                    }
                    if (!isNaN(axis_layout.upper_buffer)) {
                        data_extent[1] += original_extent_span * axis_layout.upper_buffer;
                    }
                    if (typeof axis_layout.min_extent == 'object') {
                        // The data should span at least the range specified by min_extent, an array with [low, high]
                        var range_min = axis_layout.min_extent[0];
                        var range_max = axis_layout.min_extent[1];
                        if (!isNaN(range_min) && !isNaN(range_max)) {
                            data_extent[0] = Math.min(data_extent[0], range_min);
                        }
                        if (!isNaN(range_max)) {
                            data_extent[1] = Math.max(data_extent[1], range_max);
                        }
                    }
                    // If specified, floor and ceiling will override the actual data range
                    return [
                        isNaN(axis_layout.floor) ? data_extent[0] : axis_layout.floor,
                        isNaN(axis_layout.ceiling) ? data_extent[1] : axis_layout.ceiling
                    ];
                }
            }
            // If this is for the x axis and no extent could be generated yet but state has a defined start and end
            // then default to using the state-defined region as the extent
            if (dimension === 'x' && !isNaN(this.state.start) && !isNaN(this.state.end)) {
                return [
                    this.state.start,
                    this.state.end
                ];
            }
            // No conditions met for generating a valid extent, return an empty array
            return [];
        };
        /**
 * Allow this data layer to tell the panel what axis ticks it thinks it will require. The panel may choose whether
 *   to use some, all, or none of these when rendering, either alone or in conjunction with other data layers.
 *
 *   This method is a stub and should be overridden in data layers that need to specify custom behavior.
 *
 * @param {('x'|'y1'|'y2')} dimension
 * @param {Object} [config] Additional parameters for the panel to specify how it wants ticks to be drawn. The names
 *   and meanings of these parameters may vary between different data layers.
 * @returns {Object[]}
 *   An array of objects: each object must have an 'x' attribute to position the tick.
 *   Other supported object keys:
 *     * text: string to render for a given tick
 *     * style: d3-compatible CSS style object
 *     * transform: SVG transform attribute string
 *     * color: string or LocusZoom scalable parameter object
 */
        LocusZoom.DataLayer.prototype.getTicks = function (dimension, config) {
            if ([
                    'x',
                    'y1',
                    'y2'
                ].indexOf(dimension) === -1) {
                throw 'Invalid dimension identifier at layer level' + dimension;
            }
            return [];
        };
        /**
 * Generate a tool tip for a given element
 * @param {String|Object} d The element associated with the tooltip
 * @param {String} [id] An identifier to the tooltip
 */
        LocusZoom.DataLayer.prototype.createTooltip = function (d, id) {
            if (typeof this.layout.tooltip != 'object') {
                throw 'DataLayer [' + this.id + '] layout does not define a tooltip';
            }
            if (typeof id == 'undefined') {
                id = this.getElementId(d);
            }
            if (this.tooltips[id]) {
                this.positionTooltip(id);
                return;
            }
            this.tooltips[id] = {
                data: d,
                arrow: null,
                selector: d3.select(this.parent_plot.svg.node().parentNode).append('div').attr('class', 'lz-data_layer-tooltip').attr('id', id + '-tooltip')
            };
            this.updateTooltip(d);
            return this;
        };
        /**
 * Update a tool tip (generate its inner HTML)
 * @param {String|Object} d The element associated with the tooltip
 * @param {String} [id] An identifier to the tooltip
 */
        LocusZoom.DataLayer.prototype.updateTooltip = function (d, id) {
            if (typeof id == 'undefined') {
                id = this.getElementId(d);
            }
            // Empty the tooltip of all HTML (including its arrow!)
            this.tooltips[id].selector.html('');
            this.tooltips[id].arrow = null;
            // Set the new HTML
            if (this.layout.tooltip.html) {
                this.tooltips[id].selector.html(LocusZoom.parseFields(d, this.layout.tooltip.html));
            }
            // If the layout allows tool tips on this data layer to be closable then add the close button
            // and add padding to the tooltip to accommodate it
            if (this.layout.tooltip.closable) {
                this.tooltips[id].selector.insert('button', ':first-child').attr('class', 'lz-tooltip-close-button').attr('title', 'Close').text('\xD7').on('click', function () {
                    this.destroyTooltip(id);
                }.bind(this));
            }
            // Apply data directly to the tool tip for easier retrieval by custom UI elements inside the tool tip
            this.tooltips[id].selector.data([d]);
            // Reposition and draw a new arrow
            this.positionTooltip(id);
            return this;
        };
        /**
 * Destroy tool tip - remove the tool tip element from the DOM and delete the tool tip's record on the data layer
 * @param {String|Object} d The element associated with the tooltip
 * @param {String} [id] An identifier to the tooltip
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.destroyTooltip = function (d, id) {
            if (typeof d == 'string') {
                id = d;
            } else if (typeof id == 'undefined') {
                id = this.getElementId(d);
            }
            if (this.tooltips[id]) {
                if (typeof this.tooltips[id].selector == 'object') {
                    this.tooltips[id].selector.remove();
                }
                delete this.tooltips[id];
            }
            return this;
        };
        /**
 * Loop through and destroy all tool tips on this data layer
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.destroyAllTooltips = function () {
            for (var id in this.tooltips) {
                this.destroyTooltip(id);
            }
            return this;
        };
        //
        /**
 * Position tool tip - naïve function to place a tool tip to the lower right of the current mouse element
 *   Most data layers reimplement this method to position tool tips specifically for the data they display
 * @param {String} id The identifier of the tooltip to position
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.positionTooltip = function (id) {
            if (typeof id != 'string') {
                throw 'Unable to position tooltip: id is not a string';
            }
            // Position the div itself
            this.tooltips[id].selector.style('left', d3.event.pageX + 'px').style('top', d3.event.pageY + 'px');
            // Create / update position on arrow connecting tooltip to data
            if (!this.tooltips[id].arrow) {
                this.tooltips[id].arrow = this.tooltips[id].selector.append('div').style('position', 'absolute').attr('class', 'lz-data_layer-tooltip-arrow_top_left');
            }
            this.tooltips[id].arrow.style('left', '-1px').style('top', '-1px');
            return this;
        };
        /**
 * Loop through and position all tool tips on this data layer
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.positionAllTooltips = function () {
            for (var id in this.tooltips) {
                this.positionTooltip(id);
            }
            return this;
        };
        /**
 * Show or hide a tool tip by ID depending on directives in the layout and state values relative to the ID
 * @param {String|Object} element The element associated with the tooltip
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.showOrHideTooltip = function (element) {
            if (typeof this.layout.tooltip != 'object') {
                return;
            }
            var id = this.getElementId(element);
            var resolveStatus = function (statuses, directive, operator) {
                var status = null;
                if (typeof statuses != 'object' || statuses === null) {
                    return null;
                }
                if (Array.isArray(directive)) {
                    if (typeof operator == 'undefined') {
                        operator = 'and';
                    }
                    if (directive.length === 1) {
                        status = statuses[directive[0]];
                    } else {
                        status = directive.reduce(function (previousValue, currentValue) {
                            if (operator === 'and') {
                                return statuses[previousValue] && statuses[currentValue];
                            } else if (operator === 'or') {
                                return statuses[previousValue] || statuses[currentValue];
                            }
                            return null;
                        });
                    }
                } else if (typeof directive == 'object') {
                    var sub_status;
                    for (var sub_operator in directive) {
                        sub_status = resolveStatus(statuses, directive[sub_operator], sub_operator);
                        if (status === null) {
                            status = sub_status;
                        } else if (operator === 'and') {
                            status = status && sub_status;
                        } else if (operator === 'or') {
                            status = status || sub_status;
                        }
                    }
                }
                return status;
            };
            var show_directive = {};
            if (typeof this.layout.tooltip.show == 'string') {
                show_directive = { and: [this.layout.tooltip.show] };
            } else if (typeof this.layout.tooltip.show == 'object') {
                show_directive = this.layout.tooltip.show;
            }
            var hide_directive = {};
            if (typeof this.layout.tooltip.hide == 'string') {
                hide_directive = { and: [this.layout.tooltip.hide] };
            } else if (typeof this.layout.tooltip.hide == 'object') {
                hide_directive = this.layout.tooltip.hide;
            }
            var statuses = {};
            LocusZoom.DataLayer.Statuses.adjectives.forEach(function (status) {
                var antistatus = 'un' + status;
                statuses[status] = this.state[this.state_id][status].indexOf(id) !== -1;
                statuses[antistatus] = !statuses[status];
            }.bind(this));
            var show_resolved = resolveStatus(statuses, show_directive);
            var hide_resolved = resolveStatus(statuses, hide_directive);
            // Only show tooltip if the resolved logic explicitly shows and explicitly not hides the tool tip
            // Otherwise ensure tooltip does not exist
            if (show_resolved && !hide_resolved) {
                this.createTooltip(element);
            } else {
                this.destroyTooltip(element);
            }
            return this;
        };
        /**
 * Find the elements (or indices) that match any of a set of provided filters
 * @protected
 * @param {Array[]} filters A list of filter entries: [field, value] (for equivalence testing) or
 *   [field, operator, value] for other operators
 * @param {('indexes'|'elements')} [return_type='indexes'] Specify whether to return either the indices of the matching
 *   elements, or references to the elements themselves
 * @returns {Array}
 */
        LocusZoom.DataLayer.prototype.filter = function (filters, return_type) {
            if (typeof return_type == 'undefined' || [
                    'indexes',
                    'elements'
                ].indexOf(return_type) === -1) {
                return_type = 'indexes';
            }
            if (!Array.isArray(filters)) {
                return [];
            }
            var test = function (element, filter) {
                var operators = {
                    '=': function (a, b) {
                        return a === b;
                    },
                    // eslint-disable-next-line eqeqeq
                    '!=': function (a, b) {
                        return a != b;
                    },
                    // For absence of a value, deliberately allow weak comparisons (eg undefined/null)
                    '<': function (a, b) {
                        return a < b;
                    },
                    '<=': function (a, b) {
                        return a <= b;
                    },
                    '>': function (a, b) {
                        return a > b;
                    },
                    '>=': function (a, b) {
                        return a >= b;
                    },
                    '%': function (a, b) {
                        return a % b;
                    }
                };
                if (!Array.isArray(filter)) {
                    return false;
                }
                if (filter.length === 2) {
                    return element[filter[0]] === filter[1];
                } else if (filter.length === 3 && operators[filter[1]]) {
                    return operators[filter[1]](element[filter[0]], filter[2]);
                } else {
                    return false;
                }
            };
            var matches = [];
            this.data.forEach(function (element, idx) {
                var match = true;
                filters.forEach(function (filter) {
                    if (!test(element, filter)) {
                        match = false;
                    }
                });
                if (match) {
                    matches.push(return_type === 'indexes' ? idx : element);
                }
            });
            return matches;
        };
        /**
 * @param filters
 * @returns {Array}
 */
        LocusZoom.DataLayer.prototype.filterIndexes = function (filters) {
            return this.filter(filters, 'indexes');
        };
        /**
 * @param filters
 * @returns {Array}
 */
        LocusZoom.DataLayer.prototype.filterElements = function (filters) {
            return this.filter(filters, 'elements');
        };
        LocusZoom.DataLayer.Statuses.verbs.forEach(function (verb, idx) {
            var adjective = LocusZoom.DataLayer.Statuses.adjectives[idx];
            var antiverb = 'un' + verb;
            // Set/unset a single element's status
            // TODO: Improve documentation for dynamically generated methods/properties
            LocusZoom.DataLayer.prototype[verb + 'Element'] = function (element, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                this.setElementStatus(adjective, element, true, exclusive);
                return this;
            };
            LocusZoom.DataLayer.prototype[antiverb + 'Element'] = function (element, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                this.setElementStatus(adjective, element, false, exclusive);
                return this;
            };
            // Set/unset status for arbitrarily many elements given a set of filters
            LocusZoom.DataLayer.prototype[verb + 'ElementsByFilters'] = function (filters, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                return this.setElementStatusByFilters(adjective, true, filters, exclusive);
            };
            LocusZoom.DataLayer.prototype[antiverb + 'ElementsByFilters'] = function (filters, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                return this.setElementStatusByFilters(adjective, false, filters, exclusive);
            };
            // Set/unset status for all elements
            LocusZoom.DataLayer.prototype[verb + 'AllElements'] = function () {
                this.setAllElementStatus(adjective, true);
                return this;
            };
            LocusZoom.DataLayer.prototype[antiverb + 'AllElements'] = function () {
                this.setAllElementStatus(adjective, false);
                return this;
            };
        });
        /**
 * Toggle a status (e.g. highlighted, selected, identified) on an element
 * @param {String} status The name of a recognized status to be added/removed on an appropriate element
 * @param {String|Object} element The data bound to the element of interest
 * @param {Boolean} toggle True to add the status (and associated CSS styles); false to remove it
 * @param {Boolean} exclusive Whether to only allow a state for a single element at a time
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.setElementStatus = function (status, element, toggle, exclusive) {
            // Sanity checks
            if (typeof status == 'undefined' || LocusZoom.DataLayer.Statuses.adjectives.indexOf(status) === -1) {
                throw 'Invalid status passed to DataLayer.setElementStatus()';
            }
            if (typeof element == 'undefined') {
                throw 'Invalid element passed to DataLayer.setElementStatus()';
            }
            if (typeof toggle == 'undefined') {
                toggle = true;
            }
            // Get an ID for the element or return having changed nothing
            try {
                var element_id = this.getElementId(element);
            } catch (get_element_id_error) {
                return this;
            }
            // Enforce exclusivity (force all elements to have the opposite of toggle first)
            if (exclusive) {
                this.setAllElementStatus(status, !toggle);
            }
            // Set/unset the proper status class on the appropriate DOM element(s)
            d3.select('#' + element_id).classed('lz-data_layer-' + this.layout.type + '-' + status, toggle);
            var element_status_node_id = this.getElementStatusNodeId(element);
            if (element_status_node_id !== null) {
                d3.select('#' + element_status_node_id).classed('lz-data_layer-' + this.layout.type + '-statusnode-' + status, toggle);
            }
            // Track element ID in the proper status state array
            var element_status_idx = this.state[this.state_id][status].indexOf(element_id);
            if (toggle && element_status_idx === -1) {
                this.state[this.state_id][status].push(element_id);
            }
            if (!toggle && element_status_idx !== -1) {
                this.state[this.state_id][status].splice(element_status_idx, 1);
            }
            // Trigger tool tip show/hide logic
            this.showOrHideTooltip(element);
            // Trigger layout changed event hook
            this.parent.emit('layout_changed', true);
            if (status === 'selected') {
                // Notify parents that a given element has been interacted with. For now, we will only notify on
                //   "selected" type events, which is (usually) a toggle-able state. If elements are exclusive, two selection
                //   events will be sent in short order as the previously selected element has to be de-selected first
                this.parent.emit('element_selection', {
                    element: element,
                    active: toggle
                }, true);
            }
            return this;
        };
        /**
 * Toggle a status on elements in the data layer based on a set of filters
 * @param {String} status
 * @param {Boolean} toggle
 * @param {Array} filters
 * @param {Boolean} exclusive
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.setElementStatusByFilters = function (status, toggle, filters, exclusive) {
            // Sanity check
            if (typeof status == 'undefined' || LocusZoom.DataLayer.Statuses.adjectives.indexOf(status) === -1) {
                throw 'Invalid status passed to DataLayer.setElementStatusByFilters()';
            }
            if (typeof this.state[this.state_id][status] == 'undefined') {
                return this;
            }
            if (typeof toggle == 'undefined') {
                toggle = true;
            } else {
                toggle = !!toggle;
            }
            if (typeof exclusive == 'undefined') {
                exclusive = false;
            } else {
                exclusive = !!exclusive;
            }
            if (!Array.isArray(filters)) {
                filters = [];
            }
            // Enforce exclusivity (force all elements to have the opposite of toggle first)
            if (exclusive) {
                this.setAllElementStatus(status, !toggle);
            }
            // Apply statuses
            this.filterElements(filters).forEach(function (element) {
                this.setElementStatus(status, element, toggle);
            }.bind(this));
            return this;
        };
        /**
 * Toggle a status on all elements in the data layer
 * @param {String} status
 * @param {Boolean} toggle
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.setAllElementStatus = function (status, toggle) {
            // Sanity check
            if (typeof status == 'undefined' || LocusZoom.DataLayer.Statuses.adjectives.indexOf(status) === -1) {
                throw 'Invalid status passed to DataLayer.setAllElementStatus()';
            }
            if (typeof this.state[this.state_id][status] == 'undefined') {
                return this;
            }
            if (typeof toggle == 'undefined') {
                toggle = true;
            }
            // Apply statuses
            if (toggle) {
                this.data.forEach(function (element) {
                    this.setElementStatus(status, element, true);
                }.bind(this));
            } else {
                var status_ids = this.state[this.state_id][status].slice();
                status_ids.forEach(function (id) {
                    var element = this.getElementById(id);
                    if (typeof element == 'object' && element !== null) {
                        this.setElementStatus(status, element, false);
                    }
                }.bind(this));
                this.state[this.state_id][status] = [];
            }
            // Update global status flag
            this.global_statuses[status] = toggle;
            return this;
        };
        /**
 * Apply all layout-defined behaviors (DOM event handlers) to a selection of elements
 * @param {d3.selection} selection
 */
        LocusZoom.DataLayer.prototype.applyBehaviors = function (selection) {
            if (typeof this.layout.behaviors != 'object') {
                return;
            }
            Object.keys(this.layout.behaviors).forEach(function (directive) {
                var event_match = /(click|mouseover|mouseout)/.exec(directive);
                if (!event_match) {
                    return;
                }
                selection.on(event_match[0] + '.' + directive, this.executeBehaviors(directive, this.layout.behaviors[directive]));
            }.bind(this));
        };
        /**
 * Generate a function that executes an arbitrary list of behaviors on an element during an event
 * @param {String} directive The name of the event, as described in layout.behaviors for this datalayer
 * @param {Object} behaviors An object describing the behavior to attach to this single element
 * @param {string} behaviors.action The name of the action that would trigger this behavior (eg click, mouseover, etc)
 * @param {string} behaviors.status What status to apply to the element when this behavior is triggered (highlighted,
 *  selected, etc)
 * @param {string} [behaviors.exclusive] Whether triggering the event for this element should unset the relevant status
 *   for all other elements. Useful for, eg, click events that exclusively highlight one thing.
 * @returns {function(this:LocusZoom.DataLayer)} Return a function that handles the event in context with the behavior
 *   and the element- can be attached as an event listener
 */
        LocusZoom.DataLayer.prototype.executeBehaviors = function (directive, behaviors) {
            // Determine the required state of control and shift keys during the event
            var requiredKeyStates = {
                'ctrl': directive.indexOf('ctrl') !== -1,
                'shift': directive.indexOf('shift') !== -1
            };
            return function (element) {
                // Do nothing if the required control and shift key presses (or lack thereof) doesn't match the event
                if (requiredKeyStates.ctrl !== !!d3.event.ctrlKey || requiredKeyStates.shift !== !!d3.event.shiftKey) {
                    return;
                }
                // Loop through behaviors making each one go in succession
                behaviors.forEach(function (behavior) {
                    // Route first by the action, if defined
                    if (typeof behavior != 'object' || behavior === null) {
                        return;
                    }
                    switch (behavior.action) {
                    // Set a status (set to true regardless of current status, optionally with exclusivity)
                    case 'set':
                        this.setElementStatus(behavior.status, element, true, behavior.exclusive);
                        break;
                    // Unset a status (set to false regardless of current status, optionally with exclusivity)
                    case 'unset':
                        this.setElementStatus(behavior.status, element, false, behavior.exclusive);
                        break;
                    // Toggle a status
                    case 'toggle':
                        var current_status_boolean = this.state[this.state_id][behavior.status].indexOf(this.getElementId(element)) !== -1;
                        var exclusive = behavior.exclusive && !current_status_boolean;
                        this.setElementStatus(behavior.status, element, !current_status_boolean, exclusive);
                        break;
                    // Link to a dynamic URL
                    case 'link':
                        if (typeof behavior.href == 'string') {
                            var url = LocusZoom.parseFields(element, behavior.href);
                            if (typeof behavior.target == 'string') {
                                window.open(url, behavior.target);
                            } else {
                                window.location.href = url;
                            }
                        }
                        break;
                    // Action not defined, just return
                    default:
                        break;
                    }
                    return;
                }.bind(this));
            }.bind(this);
        };
        /**
 * Get an object with the x and y coordinates of the panel's origin in terms of the entire page
 *   Necessary for positioning any HTML elements over the panel
 * @returns {{x: Number, y: Number}}
 */
        LocusZoom.DataLayer.prototype.getPageOrigin = function () {
            var panel_origin = this.parent.getPageOrigin();
            return {
                x: panel_origin.x + this.parent.layout.margin.left,
                y: panel_origin.y + this.parent.layout.margin.top
            };
        };
        /**
 * Get a data layer's current underlying data in a standard format (e.g. JSON or CSV)
 * @param {('csv'|'tsv'|'json')} format How to export the data
 * @returns {*}
 */
        LocusZoom.DataLayer.prototype.exportData = function (format) {
            var default_format = 'json';
            format = format || default_format;
            format = typeof format == 'string' ? format.toLowerCase() : default_format;
            if ([
                    'json',
                    'csv',
                    'tsv'
                ].indexOf(format) === -1) {
                format = default_format;
            }
            var ret;
            switch (format) {
            case 'json':
                try {
                    ret = JSON.stringify(this.data);
                } catch (e) {
                    ret = null;
                    console.error('Unable to export JSON data from data layer: ' + this.getBaseId() + ';', e);
                }
                break;
            case 'tsv':
            case 'csv':
                try {
                    var jsonified = JSON.parse(JSON.stringify(this.data));
                    if (typeof jsonified != 'object') {
                        ret = jsonified.toString();
                    } else if (!Array.isArray(jsonified)) {
                        ret = 'Object';
                    } else {
                        var delimiter = format === 'tsv' ? '\t' : ',';
                        var header = this.layout.fields.map(function (header) {
                            return JSON.stringify(header);
                        }).join(delimiter) + '\n';
                        ret = header + jsonified.map(function (record) {
                            return this.layout.fields.map(function (field) {
                                if (typeof record[field] == 'undefined') {
                                    return JSON.stringify(null);
                                } else if (typeof record[field] == 'object' && record[field] !== null) {
                                    return Array.isArray(record[field]) ? '"[Array(' + record[field].length + ')]"' : '"[Object]"';
                                } else {
                                    return JSON.stringify(record[field]);
                                }
                            }).join(delimiter);
                        }.bind(this)).join('\n');
                    }
                } catch (e) {
                    ret = null;
                    console.error('Unable to export CSV data from data layer: ' + this.getBaseId() + ';', e);
                }
                break;
            }
            return ret;
        };
        /**
 * Position the datalayer and all tooltips
 * @returns {LocusZoom.DataLayer}
 */
        LocusZoom.DataLayer.prototype.draw = function () {
            this.svg.container.attr('transform', 'translate(' + this.parent.layout.cliparea.origin.x + ',' + this.parent.layout.cliparea.origin.y + ')');
            this.svg.clipRect.attr('width', this.parent.layout.cliparea.width).attr('height', this.parent.layout.cliparea.height);
            this.positionAllTooltips();
            return this;
        };
        /**
 * Re-Map a data layer to reflect changes in the state of a plot (such as viewing region/ chromosome range)
 * @return {Promise}
 */
        LocusZoom.DataLayer.prototype.reMap = function () {
            this.destroyAllTooltips();
            // hack - only non-visible tooltips should be destroyed
            // and then recreated if returning to visibility
            // Fetch new data. Datalayers are only given access to the final consolidated data from the chain (not headers or raw payloads)
            var promise = this.parent_plot.lzd.getData(this.state, this.layout.fields);
            promise.then(function (new_data) {
                this.data = new_data.body;
                this.applyDataMethods();
                this.initialized = true;
            }.bind(this));
            return promise;
        };
        /**
 * The central registry of known data layer definitions (which may be stored in separate files due to length)
 * @namespace
 */
        LocusZoom.DataLayers = function () {
            var obj = {};
            var datalayers = {};
            /**
     * @name LocusZoom.DataLayers.get
     * @param {String} name The name of the datalayer
     * @param {Object} layout The configuration object for this data layer
     * @param {LocusZoom.DataLayer|LocusZoom.Panel} parent Where this layout is used
     * @returns {LocusZoom.DataLayer}
     */
            obj.get = function (name, layout, parent) {
                if (!name) {
                    return null;
                } else if (datalayers[name]) {
                    if (typeof layout != 'object') {
                        throw 'invalid layout argument for data layer [' + name + ']';
                    } else {
                        return new datalayers[name](layout, parent);
                    }
                } else {
                    throw 'data layer [' + name + '] not found';
                }
            };
            /**
     * @name LocusZoom.DataLayers.set
     * @protected
     * @param {String} name
     * @param {Function} datalayer Constructor for the datalayer
     */
            obj.set = function (name, datalayer) {
                if (datalayer) {
                    if (typeof datalayer != 'function') {
                        throw 'unable to set data layer [' + name + '], argument provided is not a function';
                    } else {
                        datalayers[name] = datalayer;
                        datalayers[name].prototype = new LocusZoom.DataLayer();
                    }
                } else {
                    delete datalayers[name];
                }
            };
            /**
     * Add a new type of datalayer to the registry of known layer types
     * @name LocusZoom.DataLayers.add
     * @param {String} name The name of the data layer to register
     * @param {Function} datalayer
     */
            obj.add = function (name, datalayer) {
                if (datalayers[name]) {
                    throw 'data layer already exists with name: ' + name;
                } else {
                    obj.set(name, datalayer);
                }
            };
            /**
     * Register a new datalayer that inherits and extends basic behaviors from a known datalayer
     * @param {String} parent_name The name of the parent data layer whose behavior is to be extended
     * @param {String} name The name of the new datalayer to register
     * @param {Object} [overrides] Object of properties and methods to combine with the prototype of the parent datalayer
     * @returns {Function} The constructor for the new child class
     */
            obj.extend = function (parent_name, name, overrides) {
                // TODO: Consider exposing additional constructor argument, if there is a use case for very granular extension
                overrides = overrides || {};
                var parent = datalayers[parent_name];
                if (!parent) {
                    throw 'Attempted to subclass an unknown or unregistered datalayer type';
                }
                if (typeof overrides !== 'object') {
                    throw 'Must specify an object of properties and methods';
                }
                var child = LocusZoom.subclass(parent, overrides);
                // Bypass .set() because we want a layer of inheritance below `DataLayer`
                datalayers[name] = child;
                return child;
            };
            /**
     * List the names of all known datalayers
     * @name LocusZoom.DataLayers.list
     * @returns {String[]}
     */
            obj.list = function () {
                return Object.keys(datalayers);
            };
            return obj;
        }();
        'use strict';
        /**
 * Create a single continuous 2D track that provides information about each datapoint
 *
 * For example, this can be used to color by membership in a group, alongside information in other panels
 *
 * @class LocusZoom.DataLayers.annotation_track
 * @augments LocusZoom.DataLayer
 * @param {Object} layout
 * @param {Object|String} [layout.color]
 * @param {Array[]} An array of filter entries specifying which points to draw annotations for.
 *  See `LocusZoom.DataLayer.filter` for details
 */
        LocusZoom.DataLayers.add('annotation_track', function (layout) {
            // In the future we may add additional options for controlling marker size/ shape, based on user feedback
            this.DefaultLayout = {
                color: '#000000',
                filters: []
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            if (!Array.isArray(layout.filters)) {
                throw 'Annotation track must specify array of filters for selecting points to annotate';
            }
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            this.render = function () {
                var self = this;
                // Only render points that currently satisfy all provided filter conditions.
                var trackData = this.filter(this.layout.filters, 'elements');
                var selection = this.svg.group.selectAll('rect.lz-data_layer-' + self.layout.type).data(trackData, function (d) {
                    return d[self.layout.id_field];
                });
                // Add new elements as needed
                selection.enter().append('rect').attr('class', 'lz-data_layer-' + this.layout.type).attr('id', function (d) {
                    return self.getElementId(d);
                });
                // Update the set of elements to reflect new data
                selection.attr('x', function (d) {
                    return self.parent['x_scale'](d[self.layout.x_axis.field]);
                }).attr('width', 1)    // TODO autocalc width of track? Based on datarange / pixel width presumably
.attr('height', self.parent.layout.height).attr('fill', function (d) {
                    return self.resolveScalableParameter(self.layout.color, d);
                });
                // Remove unused elements
                selection.exit().remove();
                // Set up tooltips and mouse interaction
                this.applyBehaviors(selection);
            };
            // Reimplement the positionTooltip() method to be annotation-specific
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var top, left, arrow_type, arrow_top, arrow_left;
                var tooltip = this.tooltips[id];
                var arrow_width = 7;
                // as defined in the default stylesheet
                var stroke_width = 1;
                // as defined in the default stylesheet
                var offset = stroke_width / 2;
                var page_origin = this.getPageOrigin();
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var data_layer_width = this.parent.layout.width - (this.parent.layout.margin.left + this.parent.layout.margin.right);
                var x_center = this.parent.x_scale(tooltip.data[this.layout.x_axis.field]);
                var y_center = data_layer_height / 2;
                // Tooltip should be horizontally centered above the point to be annotated. (or below if space is limited)
                var offset_right = Math.max(tooltip_box.width / 2 - x_center, 0);
                var offset_left = Math.max(tooltip_box.width / 2 + x_center - data_layer_width, 0);
                left = page_origin.x + x_center - tooltip_box.width / 2 - offset_left + offset_right;
                arrow_left = tooltip_box.width / 2 - arrow_width + offset_left - offset_right - offset;
                if (tooltip_box.height + stroke_width + arrow_width > data_layer_height - y_center) {
                    top = page_origin.y + y_center - (tooltip_box.height + stroke_width + arrow_width);
                    arrow_type = 'down';
                    arrow_top = tooltip_box.height - stroke_width;
                } else {
                    top = page_origin.y + y_center + stroke_width + arrow_width;
                    arrow_type = 'up';
                    arrow_top = 0 - stroke_width - arrow_width;
                }
                // Apply positions to the main div
                tooltip.selector.style('left', left + 'px').style('top', top + 'px');
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style('left', arrow_left + 'px').style('top', arrow_top + 'px');
            };
            return this;
        });
        'use strict';
        /**
 * Forest Data Layer
 * Implements a standard forest plot. In order to space out points, any layout using this must specify axis ticks
 *  and extent in advance.
 *
 * If you are using dynamically fetched data, consider using `category_forest` instead.
 *
 * @class LocusZoom.DataLayers.forest
 */
        LocusZoom.DataLayers.add('forest', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            this.DefaultLayout = {
                point_size: 40,
                point_shape: 'square',
                color: '#888888',
                fill_opacity: 1,
                y_axis: { axis: 2 },
                id_field: 'id',
                confidence_intervals: {
                    start_field: 'ci_start',
                    end_field: 'ci_end'
                },
                show_no_significance_line: true
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            // Reimplement the positionTooltip() method to be forest-specific
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var tooltip = this.tooltips[id];
                var point_size = this.resolveScalableParameter(this.layout.point_size, tooltip.data);
                var arrow_width = 7;
                // as defined in the default stylesheet
                var stroke_width = 1;
                // as defined in the default stylesheet
                var border_radius = 6;
                // as defined in the default stylesheet
                var page_origin = this.getPageOrigin();
                var x_center = this.parent.x_scale(tooltip.data[this.layout.x_axis.field]);
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                var y_center = this.parent[y_scale](tooltip.data[this.layout.y_axis.field]);
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                // Position horizontally on the left or the right depending on which side of the plot the point is on
                var offset = Math.sqrt(point_size / Math.PI);
                var left, arrow_type, arrow_left;
                if (x_center <= this.parent.layout.width / 2) {
                    left = page_origin.x + x_center + offset + arrow_width + stroke_width;
                    arrow_type = 'left';
                    arrow_left = -1 * (arrow_width + stroke_width);
                } else {
                    left = page_origin.x + x_center - tooltip_box.width - offset - arrow_width - stroke_width;
                    arrow_type = 'right';
                    arrow_left = tooltip_box.width - stroke_width;
                }
                // Position vertically centered unless we're at the top or bottom of the plot
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var top, arrow_top;
                if (y_center - tooltip_box.height / 2 <= 0) {
                    // Too close to the top, push it down
                    top = page_origin.y + y_center - 1.5 * arrow_width - border_radius;
                    arrow_top = border_radius;
                } else if (y_center + tooltip_box.height / 2 >= data_layer_height) {
                    // Too close to the bottom, pull it up
                    top = page_origin.y + y_center + arrow_width + border_radius - tooltip_box.height;
                    arrow_top = tooltip_box.height - 2 * arrow_width - border_radius;
                } else {
                    // vertically centered
                    top = page_origin.y + y_center - tooltip_box.height / 2;
                    arrow_top = tooltip_box.height / 2 - arrow_width;
                }
                // Apply positions to the main div
                tooltip.selector.style('left', left + 'px').style('top', top + 'px');
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style('left', arrow_left + 'px').style('top', arrow_top + 'px');
            };
            // Implement the main render function
            this.render = function () {
                var x_scale = 'x_scale';
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                // Generate confidence interval paths if fields are defined
                if (this.layout.confidence_intervals && this.layout.fields.indexOf(this.layout.confidence_intervals.start_field) !== -1 && this.layout.fields.indexOf(this.layout.confidence_intervals.end_field) !== -1) {
                    // Generate a selection for all forest plot confidence intervals
                    var ci_selection = this.svg.group.selectAll('rect.lz-data_layer-forest.lz-data_layer-forest-ci').data(this.data, function (d) {
                        return d[this.layout.id_field];
                    }.bind(this));
                    // Create confidence interval rect elements
                    ci_selection.enter().append('rect').attr('class', 'lz-data_layer-forest lz-data_layer-forest-ci').attr('id', function (d) {
                        return this.getElementId(d) + '_ci';
                    }.bind(this)).attr('transform', 'translate(0,' + (isNaN(this.parent.layout.height) ? 0 : this.parent.layout.height) + ')');
                    // Apply position and size parameters using transition if necessary
                    var ci_transform = function (d) {
                        var x = this.parent[x_scale](d[this.layout.confidence_intervals.start_field]);
                        var y = this.parent[y_scale](d[this.layout.y_axis.field]);
                        if (isNaN(x)) {
                            x = -1000;
                        }
                        if (isNaN(y)) {
                            y = -1000;
                        }
                        return 'translate(' + x + ',' + y + ')';
                    }.bind(this);
                    var ci_width = function (d) {
                        return this.parent[x_scale](d[this.layout.confidence_intervals.end_field]) - this.parent[x_scale](d[this.layout.confidence_intervals.start_field]);
                    }.bind(this);
                    var ci_height = 1;
                    if (this.canTransition()) {
                        ci_selection.transition().duration(this.layout.transition.duration || 0).ease(this.layout.transition.ease || 'cubic-in-out').attr('transform', ci_transform).attr('width', ci_width).attr('height', ci_height);
                    } else {
                        ci_selection.attr('transform', ci_transform).attr('width', ci_width).attr('height', ci_height);
                    }
                    // Remove old elements as needed
                    ci_selection.exit().remove();
                }
                // Generate a selection for all forest plot points
                var points_selection = this.svg.group.selectAll('path.lz-data_layer-forest.lz-data_layer-forest-point').data(this.data, function (d) {
                    return d[this.layout.id_field];
                }.bind(this));
                // Create elements, apply class, ID, and initial position
                var initial_y = isNaN(this.parent.layout.height) ? 0 : this.parent.layout.height;
                points_selection.enter().append('path').attr('class', 'lz-data_layer-forest lz-data_layer-forest-point').attr('id', function (d) {
                    return this.getElementId(d);
                }.bind(this)).attr('transform', 'translate(0,' + initial_y + ')');
                // Generate new values (or functions for them) for position, color, size, and shape
                var transform = function (d) {
                    var x = this.parent[x_scale](d[this.layout.x_axis.field]);
                    var y = this.parent[y_scale](d[this.layout.y_axis.field]);
                    if (isNaN(x)) {
                        x = -1000;
                    }
                    if (isNaN(y)) {
                        y = -1000;
                    }
                    return 'translate(' + x + ',' + y + ')';
                }.bind(this);
                var fill = function (d) {
                    return this.resolveScalableParameter(this.layout.color, d);
                }.bind(this);
                var fill_opacity = function (d) {
                    return this.resolveScalableParameter(this.layout.fill_opacity, d);
                }.bind(this);
                var shape = d3.svg.symbol().size(function (d) {
                    return this.resolveScalableParameter(this.layout.point_size, d);
                }.bind(this)).type(function (d) {
                    return this.resolveScalableParameter(this.layout.point_shape, d);
                }.bind(this));
                // Apply position and color, using a transition if necessary
                if (this.canTransition()) {
                    points_selection.transition().duration(this.layout.transition.duration || 0).ease(this.layout.transition.ease || 'cubic-in-out').attr('transform', transform).attr('fill', fill).attr('fill-opacity', fill_opacity).attr('d', shape);
                } else {
                    points_selection.attr('transform', transform).attr('fill', fill).attr('fill-opacity', fill_opacity).attr('d', shape);
                }
                // Remove old elements as needed
                points_selection.exit().remove();
                // Apply default event emitters to selection
                points_selection.on('click.event_emitter', function (element_data) {
                    this.parent.emit('element_clicked', element_data, true);
                }.bind(this));
                // Apply behaviors to points
                this.applyBehaviors(points_selection);
            };
            return this;
        });
        /**
 * A y-aligned forest plot in which the y-axis represents item labels, which are dynamically chosen when data is loaded.
 *   Each item is assumed to include both data and confidence intervals.
 *   This allows generating forest plots without defining the layout in advance.
 *
 * @class LocusZoom.DataLayers.category_forest
 * @augments LocusZoom.DataLayers.forest
 */
        LocusZoom.DataLayers.extend('forest', 'category_forest', {
            _getDataExtent: function (data, axis_config) {
                // In a forest plot, the data range is determined by *three* fields (beta + CI start/end)
                var ci_config = this.layout.confidence_intervals;
                if (ci_config && this.layout.fields.indexOf(ci_config.start_field) !== -1 && this.layout.fields.indexOf(ci_config.end_field) !== -1) {
                    var min = function (d) {
                        var f = new LocusZoom.Data.Field(ci_config.start_field);
                        return +f.resolve(d);
                    };
                    var max = function (d) {
                        var f = new LocusZoom.Data.Field(ci_config.end_field);
                        return +f.resolve(d);
                    };
                    return [
                        d3.min(data, min),
                        d3.max(data, max)
                    ];
                }
                // If there are no confidence intervals set, then range must depend only on a single field
                return LocusZoom.DataLayer.prototype._getDataExtent.call(this, data, axis_config);
            },
            getTicks: function (dimension, config) {
                // Overrides parent method
                if ([
                        'x',
                        'y1',
                        'y2'
                    ].indexOf(dimension) === -1) {
                    throw 'Invalid dimension identifier' + dimension;
                }
                // Design assumption: one axis (y1 or y2) has the ticks, and the layout says which to use
                // Also assumes that every tick gets assigned a unique matching label
                var axis_num = this.layout.y_axis.axis;
                if (dimension === 'y' + axis_num) {
                    var category_field = this.layout.y_axis.category_field;
                    if (!category_field) {
                        throw 'Layout for ' + this.layout.id + ' must specify category_field';
                    }
                    return this.data.map(function (item, index) {
                        return {
                            y: index + 1,
                            text: item[category_field]
                        };
                    });
                } else {
                    return [];
                }
            },
            applyCustomDataMethods: function () {
                // Add a synthetic yaxis field to ensure data is spread out on plot. Then, set axis floor and ceiling to
                //  correct extents.
                var field_to_add = this.layout.y_axis.field;
                if (!field_to_add) {
                    throw 'Layout for ' + this.layout.id + ' must specify yaxis.field';
                }
                this.data = this.data.map(function (item, index) {
                    item[field_to_add] = index + 1;
                    return item;
                });
                // Update axis extents based on one label for every point (with a bit of padding above and below)
                this.layout.y_axis.floor = 0;
                this.layout.y_axis.ceiling = this.data.length + 1;
                return this;
            }
        });
        'use strict';
        /*********************
 * Genes Data Layer
 * Implements a data layer that will render gene tracks
 * @class
 * @augments LocusZoom.DataLayer
*/
        LocusZoom.DataLayers.add('genes', function (layout) {
            /**
     * Define a default layout for this DataLayer type and merge it with the passed argument
     * @protected
     * @member {Object}
     * */
            this.DefaultLayout = {
                // Optionally specify different fill and stroke properties
                stroke: 'rgb(54, 54, 150)',
                color: '#363696',
                label_font_size: 12,
                label_exon_spacing: 4,
                exon_height: 16,
                bounding_box_padding: 6,
                track_vertical_spacing: 10
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            /**
     * Generate a statusnode ID for a given element
     * @override
     * @returns {String}
     */
            this.getElementStatusNodeId = function (element) {
                return this.getElementId(element) + '-statusnode';
            };
            /**
     * Helper function to sum layout values to derive total height for a single gene track
     * @returns {number}
     */
            this.getTrackHeight = function () {
                return 2 * this.layout.bounding_box_padding + this.layout.label_font_size + this.layout.label_exon_spacing + this.layout.exon_height + this.layout.track_vertical_spacing;
            };
            /**
     * A gene may have arbitrarily many transcripts, but this data layer isn't set up to render them yet.
     * Stash a transcript_idx to point to the first transcript and use that for all transcript refs.
     * @member {number}
     * @type {number}
     */
            this.transcript_idx = 0;
            /**
     * An internal counter for the number of tracks in the data layer. Used as an internal counter for looping
     *   over positions / assignments
     * @protected
     * @member {number}
     */
            this.tracks = 1;
            /**
     * Store information about genes in dataset, in a hash indexed by track number: {track_number: [gene_indices]}
     * @member {Object.<Number, Array>}
     */
            this.gene_track_index = { 1: [] };
            /**
     * Ensure that genes in overlapping chromosome regions are positioned so that parts of different genes do not
     *   overlap in the view. A track is a row used to vertically separate overlapping genes.
     * @returns {LocusZoom.DataLayer}
     */
            this.assignTracks = function () {
                /**
         * Function to get the width in pixels of a label given the text and layout attributes
         *      TODO: Move to outer scope?
         * @param {String} gene_name
         * @param {number|string} font_size
         * @returns {number}
         */
                this.getLabelWidth = function (gene_name, font_size) {
                    try {
                        var temp_text = this.svg.group.append('text').attr('x', 0).attr('y', 0).attr('class', 'lz-data_layer-genes lz-label').style('font-size', font_size).text(gene_name + '\u2192');
                        var label_width = temp_text.node().getBBox().width;
                        temp_text.remove();
                        return label_width;
                    } catch (e) {
                        return 0;
                    }
                };
                // Reinitialize some metadata
                this.tracks = 1;
                this.gene_track_index = { 1: [] };
                this.data.map(function (d, g) {
                    // If necessary, split combined gene id / version fields into discrete fields.
                    // NOTE: this may be an issue with CSG's genes data source that may eventually be solved upstream.
                    if (this.data[g].gene_id && this.data[g].gene_id.indexOf('.')) {
                        var split = this.data[g].gene_id.split('.');
                        this.data[g].gene_id = split[0];
                        this.data[g].gene_version = split[1];
                    }
                    // Stash the transcript ID on the parent gene
                    this.data[g].transcript_id = this.data[g].transcripts[this.transcript_idx].transcript_id;
                    // Determine display range start and end, based on minimum allowable gene display width, bounded by what we can see
                    // (range: values in terms of pixels on the screen)
                    this.data[g].display_range = {
                        start: this.parent.x_scale(Math.max(d.start, this.state.start)),
                        end: this.parent.x_scale(Math.min(d.end, this.state.end))
                    };
                    this.data[g].display_range.label_width = this.getLabelWidth(this.data[g].gene_name, this.layout.label_font_size);
                    this.data[g].display_range.width = this.data[g].display_range.end - this.data[g].display_range.start;
                    // Determine label text anchor (default to middle)
                    this.data[g].display_range.text_anchor = 'middle';
                    if (this.data[g].display_range.width < this.data[g].display_range.label_width) {
                        if (d.start < this.state.start) {
                            this.data[g].display_range.end = this.data[g].display_range.start + this.data[g].display_range.label_width + this.layout.label_font_size;
                            this.data[g].display_range.text_anchor = 'start';
                        } else if (d.end > this.state.end) {
                            this.data[g].display_range.start = this.data[g].display_range.end - this.data[g].display_range.label_width - this.layout.label_font_size;
                            this.data[g].display_range.text_anchor = 'end';
                        } else {
                            var centered_margin = (this.data[g].display_range.label_width - this.data[g].display_range.width) / 2 + this.layout.label_font_size;
                            if (this.data[g].display_range.start - centered_margin < this.parent.x_scale(this.state.start)) {
                                this.data[g].display_range.start = this.parent.x_scale(this.state.start);
                                this.data[g].display_range.end = this.data[g].display_range.start + this.data[g].display_range.label_width;
                                this.data[g].display_range.text_anchor = 'start';
                            } else if (this.data[g].display_range.end + centered_margin > this.parent.x_scale(this.state.end)) {
                                this.data[g].display_range.end = this.parent.x_scale(this.state.end);
                                this.data[g].display_range.start = this.data[g].display_range.end - this.data[g].display_range.label_width;
                                this.data[g].display_range.text_anchor = 'end';
                            } else {
                                this.data[g].display_range.start -= centered_margin;
                                this.data[g].display_range.end += centered_margin;
                            }
                        }
                        this.data[g].display_range.width = this.data[g].display_range.end - this.data[g].display_range.start;
                    }
                    // Add bounding box padding to the calculated display range start, end, and width
                    this.data[g].display_range.start -= this.layout.bounding_box_padding;
                    this.data[g].display_range.end += this.layout.bounding_box_padding;
                    this.data[g].display_range.width += 2 * this.layout.bounding_box_padding;
                    // Convert and stash display range values into domain values
                    // (domain: values in terms of the data set, e.g. megabases)
                    this.data[g].display_domain = {
                        start: this.parent.x_scale.invert(this.data[g].display_range.start),
                        end: this.parent.x_scale.invert(this.data[g].display_range.end)
                    };
                    this.data[g].display_domain.width = this.data[g].display_domain.end - this.data[g].display_domain.start;
                    // Using display range/domain data generated above cast each gene to tracks such that none overlap
                    this.data[g].track = null;
                    var potential_track = 1;
                    while (this.data[g].track === null) {
                        var collision_on_potential_track = false;
                        this.gene_track_index[potential_track].map(function (placed_gene) {
                            if (!collision_on_potential_track) {
                                var min_start = Math.min(placed_gene.display_range.start, this.display_range.start);
                                var max_end = Math.max(placed_gene.display_range.end, this.display_range.end);
                                if (max_end - min_start < placed_gene.display_range.width + this.display_range.width) {
                                    collision_on_potential_track = true;
                                }
                            }
                        }.bind(this.data[g]));
                        if (!collision_on_potential_track) {
                            this.data[g].track = potential_track;
                            this.gene_track_index[potential_track].push(this.data[g]);
                        } else {
                            potential_track++;
                            if (potential_track > this.tracks) {
                                this.tracks = potential_track;
                                this.gene_track_index[potential_track] = [];
                            }
                        }
                    }
                    // Stash parent references on all genes, trascripts, and exons
                    this.data[g].parent = this;
                    this.data[g].transcripts.map(function (d, t) {
                        this.data[g].transcripts[t].parent = this.data[g];
                        this.data[g].transcripts[t].exons.map(function (d, e) {
                            this.data[g].transcripts[t].exons[e].parent = this.data[g].transcripts[t];
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
                return this;
            };
            /**
     * Main render function
     */
            this.render = function () {
                var self = this;
                this.assignTracks();
                var width, height, x, y;
                // Render gene groups
                var selection = this.svg.group.selectAll('g.lz-data_layer-genes').data(this.data, function (d) {
                    return d.gene_name;
                });
                selection.enter().append('g').attr('class', 'lz-data_layer-genes');
                selection.attr('id', function (d) {
                    return this.getElementId(d);
                }.bind(this)).each(function (gene) {
                    var data_layer = gene.parent;
                    // Render gene bounding boxes (status nodes to show selected/highlighted)
                    var bboxes = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-data_layer-genes-statusnode').data([gene], function (d) {
                        return data_layer.getElementStatusNodeId(d);
                    });
                    bboxes.enter().append('rect').attr('class', 'lz-data_layer-genes lz-data_layer-genes-statusnode');
                    bboxes.attr('id', function (d) {
                        return data_layer.getElementStatusNodeId(d);
                    }).attr('rx', function () {
                        return data_layer.layout.bounding_box_padding;
                    }).attr('ry', function () {
                        return data_layer.layout.bounding_box_padding;
                    });
                    width = function (d) {
                        return d.display_range.width;
                    };
                    height = function () {
                        return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                    };
                    x = function (d) {
                        return d.display_range.start;
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight();
                    };
                    if (data_layer.canTransition()) {
                        bboxes.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        bboxes.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    bboxes.exit().remove();
                    // Render gene boundaries
                    var boundary_fill = function (d) {
                        return self.resolveScalableParameter(self.layout.color, d);
                    };
                    var boundary_stroke = function (d) {
                        return self.resolveScalableParameter(self.layout.stroke, d);
                    };
                    var boundaries = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-boundary').data([gene], function (d) {
                        return d.gene_name + '_boundary';
                    }).style({
                        fill: boundary_fill,
                        stroke: boundary_stroke
                    });
                    boundaries.enter().append('rect').attr('class', 'lz-data_layer-genes lz-boundary');
                    width = function (d) {
                        return data_layer.parent.x_scale(d.end) - data_layer.parent.x_scale(d.start);
                    };
                    height = function () {
                        return 1;    // TODO: scale dynamically?
                    };
                    x = function (d) {
                        return data_layer.parent.x_scale(d.start);
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight() + data_layer.layout.bounding_box_padding + data_layer.layout.label_font_size + data_layer.layout.label_exon_spacing + Math.max(data_layer.layout.exon_height, 3) / 2;
                    };
                    if (data_layer.canTransition()) {
                        boundaries.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        boundaries.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    boundaries.exit().remove();
                    // Render gene labels
                    var labels = d3.select(this).selectAll('text.lz-data_layer-genes.lz-label').data([gene], function (d) {
                        return d.gene_name + '_label';
                    });
                    labels.enter().append('text').attr('class', 'lz-data_layer-genes lz-label');
                    labels.attr('text-anchor', function (d) {
                        return d.display_range.text_anchor;
                    }).text(function (d) {
                        return d.strand === '+' ? d.gene_name + '\u2192' : '\u2190' + d.gene_name;
                    }).style('font-size', gene.parent.layout.label_font_size);
                    x = function (d) {
                        if (d.display_range.text_anchor === 'middle') {
                            return d.display_range.start + d.display_range.width / 2;
                        } else if (d.display_range.text_anchor === 'start') {
                            return d.display_range.start + data_layer.layout.bounding_box_padding;
                        } else if (d.display_range.text_anchor === 'end') {
                            return d.display_range.end - data_layer.layout.bounding_box_padding;
                        }
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight() + data_layer.layout.bounding_box_padding + data_layer.layout.label_font_size;
                    };
                    if (data_layer.canTransition()) {
                        labels.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('x', x).attr('y', y);
                    } else {
                        labels.attr('x', x).attr('y', y);
                    }
                    labels.exit().remove();
                    // Render exon rects (first transcript only, for now)
                    // Exons: by default color on gene properties for consistency with the gene boundary track- hence color uses d.parent.parent
                    var exon_fill = function (d) {
                        return self.resolveScalableParameter(self.layout.color, d.parent.parent);
                    };
                    var exon_stroke = function (d) {
                        return self.resolveScalableParameter(self.layout.stroke, d.parent.parent);
                    };
                    var exons = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-exon').data(gene.transcripts[gene.parent.transcript_idx].exons, function (d) {
                        return d.exon_id;
                    });
                    exons.enter().append('rect').attr('class', 'lz-data_layer-genes lz-exon');
                    exons.style({
                        fill: exon_fill,
                        stroke: exon_stroke
                    });
                    width = function (d) {
                        return data_layer.parent.x_scale(d.end) - data_layer.parent.x_scale(d.start);
                    };
                    height = function () {
                        return data_layer.layout.exon_height;
                    };
                    x = function (d) {
                        return data_layer.parent.x_scale(d.start);
                    };
                    y = function () {
                        return (gene.track - 1) * data_layer.getTrackHeight() + data_layer.layout.bounding_box_padding + data_layer.layout.label_font_size + data_layer.layout.label_exon_spacing;
                    };
                    if (data_layer.canTransition()) {
                        exons.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        exons.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    exons.exit().remove();
                    // Render gene click area
                    var clickareas = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-clickarea').data([gene], function (d) {
                        return d.gene_name + '_clickarea';
                    });
                    clickareas.enter().append('rect').attr('class', 'lz-data_layer-genes lz-clickarea');
                    clickareas.attr('id', function (d) {
                        return data_layer.getElementId(d) + '_clickarea';
                    }).attr('rx', function () {
                        return data_layer.layout.bounding_box_padding;
                    }).attr('ry', function () {
                        return data_layer.layout.bounding_box_padding;
                    });
                    width = function (d) {
                        return d.display_range.width;
                    };
                    height = function () {
                        return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                    };
                    x = function (d) {
                        return d.display_range.start;
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight();
                    };
                    if (data_layer.canTransition()) {
                        clickareas.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        clickareas.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    // Remove old clickareas as needed
                    clickareas.exit().remove();
                    // Apply default event emitters to clickareas
                    clickareas.on('click.event_emitter', function (element) {
                        element.parent.parent.emit('element_clicked', element, true);
                    });
                    // Apply mouse behaviors to clickareas
                    data_layer.applyBehaviors(clickareas);
                });
                // Remove old elements as needed
                selection.exit().remove();
            };
            /**
     * Reimplement the positionTooltip() method to be gene-specific
     * @param {String} id
     */
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var tooltip = this.tooltips[id];
                var arrow_width = 7;
                // as defined in the default stylesheet
                var stroke_width = 1;
                // as defined in the default stylesheet
                var page_origin = this.getPageOrigin();
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                var gene_bbox_id = this.getElementStatusNodeId(tooltip.data);
                var gene_bbox = d3.select('#' + gene_bbox_id).node().getBBox();
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var data_layer_width = this.parent.layout.width - (this.parent.layout.margin.left + this.parent.layout.margin.right);
                // Position horizontally: attempt to center on the portion of the gene that's visible,
                // pad to either side if bumping up against the edge of the data layer
                var gene_center_x = (tooltip.data.display_range.start + tooltip.data.display_range.end) / 2 - this.layout.bounding_box_padding / 2;
                var offset_right = Math.max(tooltip_box.width / 2 - gene_center_x, 0);
                var offset_left = Math.max(tooltip_box.width / 2 + gene_center_x - data_layer_width, 0);
                var left = page_origin.x + gene_center_x - tooltip_box.width / 2 - offset_left + offset_right;
                var arrow_left = tooltip_box.width / 2 - arrow_width / 2 + offset_left - offset_right;
                // Position vertically below the gene unless there's insufficient space
                var top, arrow_type, arrow_top;
                if (tooltip_box.height + stroke_width + arrow_width > data_layer_height - (gene_bbox.y + gene_bbox.height)) {
                    top = page_origin.y + gene_bbox.y - (tooltip_box.height + stroke_width + arrow_width);
                    arrow_type = 'down';
                    arrow_top = tooltip_box.height - stroke_width;
                } else {
                    top = page_origin.y + gene_bbox.y + gene_bbox.height + stroke_width + arrow_width;
                    arrow_type = 'up';
                    arrow_top = 0 - stroke_width - arrow_width;
                }
                // Apply positions to the main div
                tooltip.selector.style('left', left + 'px').style('top', top + 'px');
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style('left', arrow_left + 'px').style('top', arrow_top + 'px');
            };
            return this;
        });
        'use strict';
        /*********************
  Genome Legend Data Layer
  Implements a data layer that will render a genome legend
*/
        // Build a custom data layer for a genome legend
        LocusZoom.DataLayers.add('genome_legend', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            this.DefaultLayout = {
                chromosome_fill_colors: {
                    light: 'rgb(155, 155, 188)',
                    dark: 'rgb(95, 95, 128)'
                },
                chromosome_label_colors: {
                    light: 'rgb(120, 120, 186)',
                    dark: 'rgb(0, 0, 66)'
                }
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            // Implement the main render function
            this.render = function () {
                // Iterate over data to generate genome-wide start/end values for each chromosome
                var position = 0;
                this.data.forEach(function (d, i) {
                    this.data[i].genome_start = position;
                    this.data[i].genome_end = position + d['genome:base_pairs'];
                    position += d['genome:base_pairs'];
                }.bind(this));
                var chromosomes = this.svg.group.selectAll('rect.lz-data_layer-genome_legend').data(this.data, function (d) {
                    return d['genome:chr'];
                });
                // Create chromosome elements, apply class
                chromosomes.enter().append('rect').attr('class', 'lz-data_layer-genome_legend');
                // Position and fill chromosome rects
                var data_layer = this;
                var panel = this.parent;
                chromosomes.attr('fill', function (d) {
                    return d['genome:chr'] % 2 ? data_layer.layout.chromosome_fill_colors.light : data_layer.layout.chromosome_fill_colors.dark;
                }).attr('x', function (d) {
                    return panel.x_scale(d.genome_start);
                }).attr('y', 0).attr('width', function (d) {
                    return panel.x_scale(d['genome:base_pairs']);
                }).attr('height', panel.layout.cliparea.height);
                // Remove old elements as needed
                chromosomes.exit().remove();
                // Parse current state variant into a position
                // Assumes that variant string is of the format 10:123352136_C/T or 10:123352136
                var variant_parts = /([^:]+):(\d+)(?:_.*)?/.exec(this.state.variant);
                if (!variant_parts) {
                    throw 'Genome legend cannot understand the specified variant position';
                }
                var chr = variant_parts[1];
                var offset = variant_parts[2];
                // TODO: How does this handle representation of X or Y chromosomes?
                position = +this.data[chr - 1].genome_start + +offset;
                // Render the position
                var region = this.svg.group.selectAll('rect.lz-data_layer-genome_legend-marker').data([{
                        start: position,
                        end: position + 1
                    }]);
                region.enter().append('rect').attr('class', 'lz-data_layer-genome_legend-marker');
                region.transition().duration(500).style({
                    'fill': 'rgba(255, 250, 50, 0.8)',
                    'stroke': 'rgba(255, 250, 50, 0.8)',
                    'stroke-width': '3px'
                }).attr('x', function (d) {
                    return panel.x_scale(d.start);
                }).attr('y', 0).attr('width', function (d) {
                    return panel.x_scale(d.end - d.start);
                }).attr('height', panel.layout.cliparea.height);
                region.exit().remove();
            };
            return this;
        });
        'use strict';
        /**
 * Intervals Data Layer
 * Implements a data layer that will render interval annotation tracks (intervals must provide start and end values)
 * @class LocusZoom.DataLayers.intervals
 * @augments LocusZoom.DataLayer
 */
        LocusZoom.DataLayers.add('intervals', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            this.DefaultLayout = {
                start_field: 'start',
                end_field: 'end',
                track_split_field: 'state_id',
                track_split_order: 'DESC',
                track_split_legend_to_y_axis: 2,
                split_tracks: true,
                track_height: 15,
                track_vertical_spacing: 3,
                bounding_box_padding: 2,
                always_hide_legend: false,
                color: '#B8B8B8',
                fill_opacity: 1
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            /**
     * To define shared highlighting on the track split field define the status node id override
     * to generate an ID common to the track when we're actively splitting data out to separate tracks
     * @override
     * @returns {String}
     */
            this.getElementStatusNodeId = function (element) {
                if (this.layout.split_tracks) {
                    return (this.getBaseId() + '-statusnode-' + element[this.layout.track_split_field]).replace(/[:.[\],]/g, '_');
                }
                return this.getElementId(element) + '-statusnode';
            }.bind(this);
            // Helper function to sum layout values to derive total height for a single interval track
            this.getTrackHeight = function () {
                return this.layout.track_height + this.layout.track_vertical_spacing + 2 * this.layout.bounding_box_padding;
            };
            this.tracks = 1;
            this.previous_tracks = 1;
            // track-number-indexed object with arrays of interval indexes in the dataset
            this.interval_track_index = { 1: [] };
            // After we've loaded interval data interpret it to assign
            // each to a track so that they do not overlap in the view
            this.assignTracks = function () {
                // Reinitialize some metadata
                this.previous_tracks = this.tracks;
                this.tracks = 0;
                this.interval_track_index = { 1: [] };
                this.track_split_field_index = {};
                // If splitting tracks by a field's value then do a first pass determine
                // a value/track mapping that preserves the order of possible values
                if (this.layout.track_split_field && this.layout.split_tracks) {
                    this.data.map(function (d) {
                        this.track_split_field_index[d[this.layout.track_split_field]] = null;
                    }.bind(this));
                    var index = Object.keys(this.track_split_field_index);
                    if (this.layout.track_split_order === 'DESC') {
                        index.reverse();
                    }
                    index.forEach(function (val) {
                        this.track_split_field_index[val] = this.tracks + 1;
                        this.interval_track_index[this.tracks + 1] = [];
                        this.tracks++;
                    }.bind(this));
                }
                this.data.map(function (d, i) {
                    // Stash a parent reference on the interval
                    this.data[i].parent = this;
                    // Determine display range start and end, based on minimum allowable interval display width,
                    // bounded by what we can see (range: values in terms of pixels on the screen)
                    this.data[i].display_range = {
                        start: this.parent.x_scale(Math.max(d[this.layout.start_field], this.state.start)),
                        end: this.parent.x_scale(Math.min(d[this.layout.end_field], this.state.end))
                    };
                    this.data[i].display_range.width = this.data[i].display_range.end - this.data[i].display_range.start;
                    // Convert and stash display range values into domain values
                    // (domain: values in terms of the data set, e.g. megabases)
                    this.data[i].display_domain = {
                        start: this.parent.x_scale.invert(this.data[i].display_range.start),
                        end: this.parent.x_scale.invert(this.data[i].display_range.end)
                    };
                    this.data[i].display_domain.width = this.data[i].display_domain.end - this.data[i].display_domain.start;
                    // If splitting to tracks based on the value of the designated track split field
                    // then don't bother with collision detection (intervals will be grouped on tracks
                    // solely by the value of track_split_field)
                    if (this.layout.track_split_field && this.layout.split_tracks) {
                        var val = this.data[i][this.layout.track_split_field];
                        this.data[i].track = this.track_split_field_index[val];
                        this.interval_track_index[this.data[i].track].push(i);
                    } else {
                        // If not splitting to tracks based on a field value then do so based on collision
                        // detection (as how it's done for genes). Use display range/domain data generated
                        // above and cast each interval to tracks such that none overlap
                        this.tracks = 1;
                        this.data[i].track = null;
                        var potential_track = 1;
                        while (this.data[i].track === null) {
                            var collision_on_potential_track = false;
                            this.interval_track_index[potential_track].map(function (placed_interval) {
                                if (!collision_on_potential_track) {
                                    var min_start = Math.min(placed_interval.display_range.start, this.display_range.start);
                                    var max_end = Math.max(placed_interval.display_range.end, this.display_range.end);
                                    if (max_end - min_start < placed_interval.display_range.width + this.display_range.width) {
                                        collision_on_potential_track = true;
                                    }
                                }
                            }.bind(this.data[i]));
                            if (!collision_on_potential_track) {
                                this.data[i].track = potential_track;
                                this.interval_track_index[potential_track].push(this.data[i]);
                            } else {
                                potential_track++;
                                if (potential_track > this.tracks) {
                                    this.tracks = potential_track;
                                    this.interval_track_index[potential_track] = [];
                                }
                            }
                        }
                    }
                }.bind(this));
                return this;
            };
            // Implement the main render function
            this.render = function () {
                this.assignTracks();
                // Remove any shared highlight nodes and re-render them if we're splitting on tracks
                // At most there will only be dozen or so nodes here (one per track) and each time
                // we render data we may have new tracks, so wiping/redrawing all is reasonable.
                this.svg.group.selectAll('.lz-data_layer-intervals-statusnode.lz-data_layer-intervals-shared').remove();
                Object.keys(this.track_split_field_index).forEach(function (key) {
                    // Make a psuedo-element so that we can generate an id for the shared node
                    var psuedoElement = {};
                    psuedoElement[this.layout.track_split_field] = key;
                    // Insert the shared node
                    var sharedstatusnode_style = { display: this.layout.split_tracks ? null : 'none' };
                    this.svg.group.insert('rect', ':first-child').attr('id', this.getElementStatusNodeId(psuedoElement)).attr('class', 'lz-data_layer-intervals lz-data_layer-intervals-statusnode lz-data_layer-intervals-shared').attr('rx', this.layout.bounding_box_padding).attr('ry', this.layout.bounding_box_padding).attr('width', this.parent.layout.cliparea.width).attr('height', this.getTrackHeight() - this.layout.track_vertical_spacing).attr('x', 0).attr('y', (this.track_split_field_index[key] - 1) * this.getTrackHeight()).style(sharedstatusnode_style);
                }.bind(this));
                var width, height, x, y, fill, fill_opacity;
                // Render interval groups
                var selection = this.svg.group.selectAll('g.lz-data_layer-intervals').data(this.data, function (d) {
                    return d[this.layout.id_field];
                }.bind(this));
                selection.enter().append('g').attr('class', 'lz-data_layer-intervals');
                selection.attr('id', function (d) {
                    return this.getElementId(d);
                }.bind(this)).each(function (interval) {
                    var data_layer = interval.parent;
                    // Render interval status nodes (displayed behind intervals to show highlight
                    // without needing to modify interval display element(s))
                    var statusnode_style = { display: data_layer.layout.split_tracks ? 'none' : null };
                    var statusnodes = d3.select(this).selectAll('rect.lz-data_layer-intervals.lz-data_layer-intervals-statusnode.lz-data_layer-intervals-statusnode-discrete').data([interval], function (d) {
                        return data_layer.getElementId(d) + '-statusnode';
                    });
                    statusnodes.enter().insert('rect', ':first-child').attr('class', 'lz-data_layer-intervals lz-data_layer-intervals-statusnode lz-data_layer-intervals-statusnode-discrete');
                    statusnodes.attr('id', function (d) {
                        return data_layer.getElementId(d) + '-statusnode';
                    }).attr('rx', function () {
                        return data_layer.layout.bounding_box_padding;
                    }).attr('ry', function () {
                        return data_layer.layout.bounding_box_padding;
                    }).style(statusnode_style);
                    width = function (d) {
                        return d.display_range.width + 2 * data_layer.layout.bounding_box_padding;
                    };
                    height = function () {
                        return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                    };
                    x = function (d) {
                        return d.display_range.start - data_layer.layout.bounding_box_padding;
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight();
                    };
                    if (data_layer.canTransition()) {
                        statusnodes.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        statusnodes.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    statusnodes.exit().remove();
                    // Render primary interval rects
                    var rects = d3.select(this).selectAll('rect.lz-data_layer-intervals.lz-interval_rect').data([interval], function (d) {
                        return d[data_layer.layout.id_field] + '_interval_rect';
                    });
                    rects.enter().append('rect').attr('class', 'lz-data_layer-intervals lz-interval_rect');
                    height = data_layer.layout.track_height;
                    width = function (d) {
                        return d.display_range.width;
                    };
                    x = function (d) {
                        return d.display_range.start;
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight() + data_layer.layout.bounding_box_padding;
                    };
                    fill = function (d) {
                        return data_layer.resolveScalableParameter(data_layer.layout.color, d);
                    };
                    fill_opacity = function (d) {
                        return data_layer.resolveScalableParameter(data_layer.layout.fill_opacity, d);
                    };
                    if (data_layer.canTransition()) {
                        rects.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y).attr('fill', fill).attr('fill-opacity', fill_opacity);
                    } else {
                        rects.attr('width', width).attr('height', height).attr('x', x).attr('y', y).attr('fill', fill).attr('fill-opacity', fill_opacity);
                    }
                    rects.exit().remove();
                    // Render interval click areas
                    var clickareas = d3.select(this).selectAll('rect.lz-data_layer-intervals.lz-clickarea').data([interval], function (d) {
                        return d.interval_name + '_clickarea';
                    });
                    clickareas.enter().append('rect').attr('class', 'lz-data_layer-intervals lz-clickarea');
                    clickareas.attr('id', function (d) {
                        return data_layer.getElementId(d) + '_clickarea';
                    }).attr('rx', function () {
                        return data_layer.layout.bounding_box_padding;
                    }).attr('ry', function () {
                        return data_layer.layout.bounding_box_padding;
                    });
                    width = function (d) {
                        return d.display_range.width;
                    };
                    height = function () {
                        return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                    };
                    x = function (d) {
                        return d.display_range.start;
                    };
                    y = function (d) {
                        return (d.track - 1) * data_layer.getTrackHeight();
                    };
                    if (data_layer.canTransition()) {
                        clickareas.transition().duration(data_layer.layout.transition.duration || 0).ease(data_layer.layout.transition.ease || 'cubic-in-out').attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    } else {
                        clickareas.attr('width', width).attr('height', height).attr('x', x).attr('y', y);
                    }
                    // Remove old clickareas as needed
                    clickareas.exit().remove();
                    // Apply default event emitters to clickareas
                    clickareas.on('click', function (element_data) {
                        element_data.parent.parent.emit('element_clicked', element_data, true);
                    }.bind(this));
                    // Apply mouse behaviors to clickareas
                    data_layer.applyBehaviors(clickareas);
                });
                // Remove old elements as needed
                selection.exit().remove();
                // Update the legend axis if the number of ticks changed
                if (this.previous_tracks !== this.tracks) {
                    this.updateSplitTrackAxis();
                }
                return this;
            };
            // Reimplement the positionTooltip() method to be interval-specific
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var tooltip = this.tooltips[id];
                var arrow_width = 7;
                // as defined in the default stylesheet
                var stroke_width = 1;
                // as defined in the default stylesheet
                var page_origin = this.getPageOrigin();
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                var interval_bbox = d3.select('#' + this.getElementStatusNodeId(tooltip.data)).node().getBBox();
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var data_layer_width = this.parent.layout.width - (this.parent.layout.margin.left + this.parent.layout.margin.right);
                // Position horizontally: attempt to center on the portion of the interval that's visible,
                // pad to either side if bumping up against the edge of the data layer
                var interval_center_x = (tooltip.data.display_range.start + tooltip.data.display_range.end) / 2 - this.layout.bounding_box_padding / 2;
                var offset_right = Math.max(tooltip_box.width / 2 - interval_center_x, 0);
                var offset_left = Math.max(tooltip_box.width / 2 + interval_center_x - data_layer_width, 0);
                var left = page_origin.x + interval_center_x - tooltip_box.width / 2 - offset_left + offset_right;
                var arrow_left = tooltip_box.width / 2 - arrow_width / 2 + offset_left - offset_right;
                // Position vertically below the interval unless there's insufficient space
                var top, arrow_type, arrow_top;
                if (tooltip_box.height + stroke_width + arrow_width > data_layer_height - (interval_bbox.y + interval_bbox.height)) {
                    top = page_origin.y + interval_bbox.y - (tooltip_box.height + stroke_width + arrow_width);
                    arrow_type = 'down';
                    arrow_top = tooltip_box.height - stroke_width;
                } else {
                    top = page_origin.y + interval_bbox.y + interval_bbox.height + stroke_width + arrow_width;
                    arrow_type = 'up';
                    arrow_top = 0 - stroke_width - arrow_width;
                }
                // Apply positions to the main div
                tooltip.selector.style('left', left + 'px').style('top', top + 'px');
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style('left', arrow_left + 'px').style('top', arrow_top + 'px');
            };
            // Redraw split track axis or hide it, and show/hide the legend, as determined
            // by current layout parameters and data
            this.updateSplitTrackAxis = function () {
                var legend_axis = this.layout.track_split_legend_to_y_axis ? 'y' + this.layout.track_split_legend_to_y_axis : false;
                if (this.layout.split_tracks) {
                    var tracks = +this.tracks || 0;
                    var track_height = +this.layout.track_height || 0;
                    var track_spacing = 2 * (+this.layout.bounding_box_padding || 0) + (+this.layout.track_vertical_spacing || 0);
                    var target_height = tracks * track_height + (tracks - 1) * track_spacing;
                    this.parent.scaleHeightToData(target_height);
                    if (legend_axis && this.parent.legend) {
                        this.parent.legend.hide();
                        this.parent.layout.axes[legend_axis] = {
                            render: true,
                            ticks: [],
                            range: {
                                start: target_height - this.layout.track_height / 2,
                                end: this.layout.track_height / 2
                            }
                        };
                        this.layout.legend.forEach(function (element) {
                            var key = element[this.layout.track_split_field];
                            var track = this.track_split_field_index[key];
                            if (track) {
                                if (this.layout.track_split_order === 'DESC') {
                                    track = Math.abs(track - tracks - 1);
                                }
                                this.parent.layout.axes[legend_axis].ticks.push({
                                    y: track,
                                    text: element.label
                                });
                            }
                        }.bind(this));
                        this.layout.y_axis = {
                            axis: this.layout.track_split_legend_to_y_axis,
                            floor: 1,
                            ceiling: tracks
                        };
                        this.parent.render();
                    }
                    this.parent_plot.positionPanels();
                } else {
                    if (legend_axis && this.parent.legend) {
                        if (!this.layout.always_hide_legend) {
                            this.parent.legend.show();
                        }
                        this.parent.layout.axes[legend_axis] = { render: false };
                        this.parent.render();
                    }
                }
                return this;
            };
            // Method to not only toggle the split tracks boolean but also update
            // necessary display values to animate a complete merge/split
            this.toggleSplitTracks = function () {
                this.layout.split_tracks = !this.layout.split_tracks;
                if (this.parent.legend && !this.layout.always_hide_legend) {
                    this.parent.layout.margin.bottom = 5 + (this.layout.split_tracks ? 0 : this.parent.legend.layout.height + 5);
                }
                this.render();
                this.updateSplitTrackAxis();
                return this;
            };
            return this;
        });
        'use strict';
        /*********************
 * Line Data Layer
 * Implements a standard line plot, representing either a trace or a filled curve.
 * @class
 * @augments LocusZoom.DataLayer
*/
        LocusZoom.DataLayers.add('line', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            /** @member {Object} */
            this.DefaultLayout = {
                style: {
                    fill: 'none',
                    'stroke-width': '2px'
                },
                interpolate: 'linear',
                x_axis: { field: 'x' },
                y_axis: {
                    field: 'y',
                    axis: 1
                },
                hitarea_width: 5
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Var for storing mouse events for use in tool tip positioning
            /** @member {String} */
            this.mouse_event = null;
            /**
     * Var for storing the generated line function itself
     * @member {d3.svg.line}
     * */
            this.line = null;
            /**
     * The timeout identifier returned by setTimeout
     * @member {Number}
     */
            this.tooltip_timeout = null;
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            /**
     * Helper function to get display and data objects representing
     *   the x/y coordinates of the current mouse event with respect to the line in terms of the display
     *   and the interpolated values of the x/y fields with respect to the line
     * @returns {{display: {x: *, y: null}, data: {}, slope: null}}
     */
            this.getMouseDisplayAndData = function () {
                var ret = {
                    display: {
                        x: d3.mouse(this.mouse_event)[0],
                        y: null
                    },
                    data: {},
                    slope: null
                };
                var x_field = this.layout.x_axis.field;
                var y_field = this.layout.y_axis.field;
                var x_scale = 'x_scale';
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                ret.data[x_field] = this.parent[x_scale].invert(ret.display.x);
                var bisect = d3.bisector(function (datum) {
                    return +datum[x_field];
                }).left;
                var index = bisect(this.data, ret.data[x_field]) - 1;
                var startDatum = this.data[index];
                var endDatum = this.data[index + 1];
                var interpolate = d3.interpolateNumber(+startDatum[y_field], +endDatum[y_field]);
                var range = +endDatum[x_field] - +startDatum[x_field];
                ret.data[y_field] = interpolate(ret.data[x_field] % range / range);
                ret.display.y = this.parent[y_scale](ret.data[y_field]);
                if (this.layout.tooltip.x_precision) {
                    ret.data[x_field] = ret.data[x_field].toPrecision(this.layout.tooltip.x_precision);
                }
                if (this.layout.tooltip.y_precision) {
                    ret.data[y_field] = ret.data[y_field].toPrecision(this.layout.tooltip.y_precision);
                }
                ret.slope = (this.parent[y_scale](endDatum[y_field]) - this.parent[y_scale](startDatum[y_field])) / (this.parent[x_scale](endDatum[x_field]) - this.parent[x_scale](startDatum[x_field]));
                return ret;
            };
            /**
     * Reimplement the positionTooltip() method to be line-specific
     * @param {String} id Identify the tooltip to be positioned
     */
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var tooltip = this.tooltips[id];
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                var arrow_width = 7;
                // as defined in the default stylesheet
                var border_radius = 6;
                // as defined in the default stylesheet
                var stroke_width = parseFloat(this.layout.style['stroke-width']) || 1;
                var page_origin = this.getPageOrigin();
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var data_layer_width = this.parent.layout.width - (this.parent.layout.margin.left + this.parent.layout.margin.right);
                var top, left, arrow_top, arrow_left, arrow_type;
                // Determine x/y coordinates for display and data
                var dd = this.getMouseDisplayAndData();
                // If the absolute value of the slope of the line at this point is above 1 (including Infinity)
                // then position the tool tip left/right. Otherwise position top/bottom.
                if (Math.abs(dd.slope) > 1) {
                    // Position horizontally on the left or the right depending on which side of the plot the point is on
                    if (dd.display.x <= this.parent.layout.width / 2) {
                        left = page_origin.x + dd.display.x + stroke_width + arrow_width + stroke_width;
                        arrow_type = 'left';
                        arrow_left = -1 * (arrow_width + stroke_width);
                    } else {
                        left = page_origin.x + dd.display.x - tooltip_box.width - stroke_width - arrow_width - stroke_width;
                        arrow_type = 'right';
                        arrow_left = tooltip_box.width - stroke_width;
                    }
                    // Position vertically centered unless we're at the top or bottom of the plot
                    if (dd.display.y - tooltip_box.height / 2 <= 0) {
                        // Too close to the top, push it down
                        top = page_origin.y + dd.display.y - 1.5 * arrow_width - border_radius;
                        arrow_top = border_radius;
                    } else if (dd.display.y + tooltip_box.height / 2 >= data_layer_height) {
                        // Too close to the bottom, pull it up
                        top = page_origin.y + dd.display.y + arrow_width + border_radius - tooltip_box.height;
                        arrow_top = tooltip_box.height - 2 * arrow_width - border_radius;
                    } else {
                        // vertically centered
                        top = page_origin.y + dd.display.y - tooltip_box.height / 2;
                        arrow_top = tooltip_box.height / 2 - arrow_width;
                    }
                } else {
                    // Position horizontally: attempt to center on the mouse's x coordinate
                    // pad to either side if bumping up against the edge of the data layer
                    var offset_right = Math.max(tooltip_box.width / 2 - dd.display.x, 0);
                    var offset_left = Math.max(tooltip_box.width / 2 + dd.display.x - data_layer_width, 0);
                    left = page_origin.x + dd.display.x - tooltip_box.width / 2 - offset_left + offset_right;
                    var min_arrow_left = arrow_width / 2;
                    var max_arrow_left = tooltip_box.width - 2.5 * arrow_width;
                    arrow_left = tooltip_box.width / 2 - arrow_width + offset_left - offset_right;
                    arrow_left = Math.min(Math.max(arrow_left, min_arrow_left), max_arrow_left);
                    // Position vertically above the line unless there's insufficient space
                    if (tooltip_box.height + stroke_width + arrow_width > dd.display.y) {
                        top = page_origin.y + dd.display.y + stroke_width + arrow_width;
                        arrow_type = 'up';
                        arrow_top = 0 - stroke_width - arrow_width;
                    } else {
                        top = page_origin.y + dd.display.y - (tooltip_box.height + stroke_width + arrow_width);
                        arrow_type = 'down';
                        arrow_top = tooltip_box.height - stroke_width;
                    }
                }
                // Apply positions to the main div
                tooltip.selector.style({
                    left: left + 'px',
                    top: top + 'px'
                });
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style({
                    'left': arrow_left + 'px',
                    top: arrow_top + 'px'
                });
            };
            /**
     * Implement the main render function
     */
            this.render = function () {
                // Several vars needed to be in scope
                var data_layer = this;
                var panel = this.parent;
                var x_field = this.layout.x_axis.field;
                var y_field = this.layout.y_axis.field;
                var x_scale = 'x_scale';
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                // Join data to the line selection
                var selection = this.svg.group.selectAll('path.lz-data_layer-line').data([this.data]);
                // Create path element, apply class
                this.path = selection.enter().append('path').attr('class', 'lz-data_layer-line');
                // Generate the line
                if (this.layout.style.fill && this.layout.style.fill !== 'none') {
                    // Filled curve: define the line as a filled boundary
                    this.line = d3.svg.area().x(function (d) {
                        return parseFloat(panel[x_scale](d[x_field]));
                    }).y0(function (d) {
                        return parseFloat(panel[y_scale](0));
                    }).y1(function (d) {
                        return parseFloat(panel[y_scale](d[y_field]));
                    });
                } else {
                    // Basic line
                    this.line = d3.svg.line().x(function (d) {
                        return parseFloat(panel[x_scale](d[x_field]));
                    }).y(function (d) {
                        return parseFloat(panel[y_scale](d[y_field]));
                    }).interpolate(this.layout.interpolate);
                }
                // Apply line and style
                if (this.canTransition()) {
                    selection.transition().duration(this.layout.transition.duration || 0).ease(this.layout.transition.ease || 'cubic-in-out').attr('d', this.line).style(this.layout.style);
                } else {
                    selection.attr('d', this.line).style(this.layout.style);
                }
                // Apply tooltip, etc
                if (this.layout.tooltip) {
                    // Generate an overlaying transparent "hit area" line for more intuitive mouse events
                    var hitarea_width = parseFloat(this.layout.hitarea_width).toString() + 'px';
                    var hitarea = this.svg.group.selectAll('path.lz-data_layer-line-hitarea').data([this.data]);
                    hitarea.enter().append('path').attr('class', 'lz-data_layer-line-hitarea').style('stroke-width', hitarea_width);
                    var hitarea_line = d3.svg.line().x(function (d) {
                        return parseFloat(panel[x_scale](d[x_field]));
                    }).y(function (d) {
                        return parseFloat(panel[y_scale](d[y_field]));
                    }).interpolate(this.layout.interpolate);
                    hitarea.attr('d', hitarea_line).on('mouseover', function () {
                        clearTimeout(data_layer.tooltip_timeout);
                        data_layer.mouse_event = this;
                        var dd = data_layer.getMouseDisplayAndData();
                        data_layer.createTooltip(dd.data);
                    }).on('mousemove', function () {
                        clearTimeout(data_layer.tooltip_timeout);
                        data_layer.mouse_event = this;
                        var dd = data_layer.getMouseDisplayAndData();
                        data_layer.updateTooltip(dd.data);
                        data_layer.positionTooltip(data_layer.getElementId());
                    }).on('mouseout', function () {
                        data_layer.tooltip_timeout = setTimeout(function () {
                            data_layer.mouse_event = null;
                            data_layer.destroyTooltip(data_layer.getElementId());
                        }, 300);
                    });
                    hitarea.exit().remove();
                }
                // Remove old elements as needed
                selection.exit().remove();
            };
            /**
     * Redefine setElementStatus family of methods as line data layers will only ever have a single path element
     * @param {String} status A member of `LocusZoom.DataLayer.Statuses.adjectives`
     * @param {String|Object} element
     * @param {Boolean} toggle
     * @returns {LocusZoom.DataLayer}
     */
            this.setElementStatus = function (status, element, toggle) {
                return this.setAllElementStatus(status, toggle);
            };
            this.setElementStatusByFilters = function (status, toggle) {
                return this.setAllElementStatus(status, toggle);
            };
            this.setAllElementStatus = function (status, toggle) {
                // Sanity check
                if (typeof status == 'undefined' || LocusZoom.DataLayer.Statuses.adjectives.indexOf(status) === -1) {
                    throw 'Invalid status passed to DataLayer.setAllElementStatus()';
                }
                if (typeof this.state[this.state_id][status] == 'undefined') {
                    return this;
                }
                if (typeof toggle == 'undefined') {
                    toggle = true;
                }
                // Update global status flag
                this.global_statuses[status] = toggle;
                // Apply class to path based on global status flags
                var path_class = 'lz-data_layer-line';
                Object.keys(this.global_statuses).forEach(function (global_status) {
                    if (this.global_statuses[global_status]) {
                        path_class += ' lz-data_layer-line-' + global_status;
                    }
                }.bind(this));
                this.path.attr('class', path_class);
                // Trigger layout changed event hook
                this.parent.emit('layout_changed', true);
                return this;
            };
            return this;
        });
        /***************************
 *  Orthogonal Line Data Layer
 *  Implements a horizontal or vertical line given an orientation and an offset in the layout
 *  Does not require a data source
 * @class
 * @augments LocusZoom.DataLayer
*/
        LocusZoom.DataLayers.add('orthogonal_line', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            this.DefaultLayout = {
                style: {
                    'stroke': '#D3D3D3',
                    'stroke-width': '3px',
                    'stroke-dasharray': '10px 10px'
                },
                orientation: 'horizontal',
                x_axis: {
                    axis: 1,
                    decoupled: true
                },
                y_axis: {
                    axis: 1,
                    decoupled: true
                },
                offset: 0
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Require that orientation be "horizontal" or "vertical" only
            if ([
                    'horizontal',
                    'vertical'
                ].indexOf(layout.orientation) === -1) {
                layout.orientation = 'horizontal';
            }
            // Vars for storing the data generated line
            /** @member {Array} */
            this.data = [];
            /** @member {d3.svg.line} */
            this.line = null;
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            /**
     * Implement the main render function
     */
            this.render = function () {
                // Several vars needed to be in scope
                var panel = this.parent;
                var x_scale = 'x_scale';
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                var x_extent = 'x_extent';
                var y_extent = 'y' + this.layout.y_axis.axis + '_extent';
                var x_range = 'x_range';
                var y_range = 'y' + this.layout.y_axis.axis + '_range';
                // Generate data using extents depending on orientation
                if (this.layout.orientation === 'horizontal') {
                    this.data = [
                        {
                            x: panel[x_extent][0],
                            y: this.layout.offset
                        },
                        {
                            x: panel[x_extent][1],
                            y: this.layout.offset
                        }
                    ];
                } else {
                    this.data = [
                        {
                            x: this.layout.offset,
                            y: panel[y_extent][0]
                        },
                        {
                            x: this.layout.offset,
                            y: panel[y_extent][1]
                        }
                    ];
                }
                // Join data to the line selection
                var selection = this.svg.group.selectAll('path.lz-data_layer-line').data([this.data]);
                // Create path element, apply class
                this.path = selection.enter().append('path').attr('class', 'lz-data_layer-line');
                // Generate the line
                this.line = d3.svg.line().x(function (d, i) {
                    var x = parseFloat(panel[x_scale](d['x']));
                    return isNaN(x) ? panel[x_range][i] : x;
                }).y(function (d, i) {
                    var y = parseFloat(panel[y_scale](d['y']));
                    return isNaN(y) ? panel[y_range][i] : y;
                }).interpolate('linear');
                // Apply line and style
                if (this.canTransition()) {
                    selection.transition().duration(this.layout.transition.duration || 0).ease(this.layout.transition.ease || 'cubic-in-out').attr('d', this.line).style(this.layout.style);
                } else {
                    selection.attr('d', this.line).style(this.layout.style);
                }
                // Remove old elements as needed
                selection.exit().remove();
            };
            return this;
        });
        'use strict';
        /**
 * Scatter Data Layer
 * Implements a standard scatter plot
 * @class LocusZoom.DataLayers.scatter
 */
        LocusZoom.DataLayers.add('scatter', function (layout) {
            // Define a default layout for this DataLayer type and merge it with the passed argument
            this.DefaultLayout = {
                point_size: 40,
                point_shape: 'circle',
                tooltip_positioning: 'horizontal',
                color: '#888888',
                fill_opacity: 1,
                y_axis: { axis: 1 },
                id_field: 'id'
            };
            layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
            // Extra default for layout spacing
            // Not in default layout since that would make the label attribute always present
            if (layout.label && isNaN(layout.label.spacing)) {
                layout.label.spacing = 4;
            }
            // Apply the arguments to set LocusZoom.DataLayer as the prototype
            LocusZoom.DataLayer.apply(this, arguments);
            // Reimplement the positionTooltip() method to be scatter-specific
            this.positionTooltip = function (id) {
                if (typeof id != 'string') {
                    throw 'Unable to position tooltip: id is not a string';
                }
                if (!this.tooltips[id]) {
                    throw 'Unable to position tooltip: id does not point to a valid tooltip';
                }
                var top, left, arrow_type, arrow_top, arrow_left;
                var tooltip = this.tooltips[id];
                var point_size = this.resolveScalableParameter(this.layout.point_size, tooltip.data);
                var offset = Math.sqrt(point_size / Math.PI);
                var arrow_width = 7;
                // as defined in the default stylesheet
                var stroke_width = 1;
                // as defined in the default stylesheet
                var border_radius = 6;
                // as defined in the default stylesheet
                var page_origin = this.getPageOrigin();
                var x_center = this.parent.x_scale(tooltip.data[this.layout.x_axis.field]);
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                var y_center = this.parent[y_scale](tooltip.data[this.layout.y_axis.field]);
                var tooltip_box = tooltip.selector.node().getBoundingClientRect();
                var data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                var data_layer_width = this.parent.layout.width - (this.parent.layout.margin.left + this.parent.layout.margin.right);
                if (this.layout.tooltip_positioning === 'vertical') {
                    // Position horizontally centered above the point
                    var offset_right = Math.max(tooltip_box.width / 2 - x_center, 0);
                    var offset_left = Math.max(tooltip_box.width / 2 + x_center - data_layer_width, 0);
                    left = page_origin.x + x_center - tooltip_box.width / 2 - offset_left + offset_right;
                    arrow_left = tooltip_box.width / 2 - arrow_width / 2 + offset_left - offset_right - offset;
                    // Position vertically above the point unless there's insufficient space, then go below
                    if (tooltip_box.height + stroke_width + arrow_width > data_layer_height - (y_center + offset)) {
                        top = page_origin.y + y_center - (offset + tooltip_box.height + stroke_width + arrow_width);
                        arrow_type = 'down';
                        arrow_top = tooltip_box.height - stroke_width;
                    } else {
                        top = page_origin.y + y_center + offset + stroke_width + arrow_width;
                        arrow_type = 'up';
                        arrow_top = 0 - stroke_width - arrow_width;
                    }
                } else {
                    // Position horizontally on the left or the right depending on which side of the plot the point is on
                    if (x_center <= this.parent.layout.width / 2) {
                        left = page_origin.x + x_center + offset + arrow_width + stroke_width;
                        arrow_type = 'left';
                        arrow_left = -1 * (arrow_width + stroke_width);
                    } else {
                        left = page_origin.x + x_center - tooltip_box.width - offset - arrow_width - stroke_width;
                        arrow_type = 'right';
                        arrow_left = tooltip_box.width - stroke_width;
                    }
                    // Position vertically centered unless we're at the top or bottom of the plot
                    data_layer_height = this.parent.layout.height - (this.parent.layout.margin.top + this.parent.layout.margin.bottom);
                    if (y_center - tooltip_box.height / 2 <= 0) {
                        // Too close to the top, push it down
                        top = page_origin.y + y_center - 1.5 * arrow_width - border_radius;
                        arrow_top = border_radius;
                    } else if (y_center + tooltip_box.height / 2 >= data_layer_height) {
                        // Too close to the bottom, pull it up
                        top = page_origin.y + y_center + arrow_width + border_radius - tooltip_box.height;
                        arrow_top = tooltip_box.height - 2 * arrow_width - border_radius;
                    } else {
                        // vertically centered
                        top = page_origin.y + y_center - tooltip_box.height / 2;
                        arrow_top = tooltip_box.height / 2 - arrow_width;
                    }
                }
                // Apply positions to the main div
                tooltip.selector.style('left', left + 'px').style('top', top + 'px');
                // Create / update position on arrow connecting tooltip to data
                if (!tooltip.arrow) {
                    tooltip.arrow = tooltip.selector.append('div').style('position', 'absolute');
                }
                tooltip.arrow.attr('class', 'lz-data_layer-tooltip-arrow_' + arrow_type).style('left', arrow_left + 'px').style('top', arrow_top + 'px');
            };
            // Function to flip labels from being anchored at the start of the text to the end
            // Both to keep labels from running outside the data layer and  also as a first
            // pass on recursive separation
            this.flip_labels = function () {
                var data_layer = this;
                var point_size = data_layer.resolveScalableParameter(data_layer.layout.point_size, {});
                var spacing = data_layer.layout.label.spacing;
                var handle_lines = Boolean(data_layer.layout.label.lines);
                var min_x = 2 * spacing;
                var max_x = data_layer.parent.layout.width - data_layer.parent.layout.margin.left - data_layer.parent.layout.margin.right - 2 * spacing;
                var flip = function (dn, dnl) {
                    var dnx = +dn.attr('x');
                    var text_swing = 2 * spacing + 2 * Math.sqrt(point_size);
                    if (handle_lines) {
                        var dnlx2 = +dnl.attr('x2');
                        var line_swing = spacing + 2 * Math.sqrt(point_size);
                    }
                    if (dn.style('text-anchor') === 'start') {
                        dn.style('text-anchor', 'end');
                        dn.attr('x', dnx - text_swing);
                        if (handle_lines) {
                            dnl.attr('x2', dnlx2 - line_swing);
                        }
                    } else {
                        dn.style('text-anchor', 'start');
                        dn.attr('x', dnx + text_swing);
                        if (handle_lines) {
                            dnl.attr('x2', dnlx2 + line_swing);
                        }
                    }
                };
                // Flip any going over the right edge from the right side to the left side
                // (all labels start on the right side)
                data_layer.label_texts.each(function (d, i) {
                    var a = this;
                    var da = d3.select(a);
                    var dax = +da.attr('x');
                    var abound = da.node().getBoundingClientRect();
                    if (dax + abound.width + spacing > max_x) {
                        var dal = handle_lines ? d3.select(data_layer.label_lines[0][i]) : null;
                        flip(da, dal);
                    }
                });
                // Second pass to flip any others that haven't flipped yet if they collide with another label
                data_layer.label_texts.each(function (d, i) {
                    var a = this;
                    var da = d3.select(a);
                    if (da.style('text-anchor') === 'end')
                        return;
                    var dax = +da.attr('x');
                    var abound = da.node().getBoundingClientRect();
                    var dal = handle_lines ? d3.select(data_layer.label_lines[0][i]) : null;
                    data_layer.label_texts.each(function () {
                        var b = this;
                        var db = d3.select(b);
                        var bbound = db.node().getBoundingClientRect();
                        var collision = abound.left < bbound.left + bbound.width + 2 * spacing && abound.left + abound.width + 2 * spacing > bbound.left && abound.top < bbound.top + bbound.height + 2 * spacing && abound.height + abound.top + 2 * spacing > bbound.top;
                        if (collision) {
                            flip(da, dal);
                            // Double check that this flip didn't push the label past min_x. If it did, immediately flip back.
                            dax = +da.attr('x');
                            if (dax - abound.width - spacing < min_x) {
                                flip(da, dal);
                            }
                        }
                        return;
                    });
                });
            };
            // Recursive function to space labels apart immediately after initial render
            // Adapted from thudfactor's fiddle here: https://jsfiddle.net/thudfactor/HdwTH/
            // TODO: Make labels also aware of data elements
            this.separate_labels = function () {
                this.seperate_iterations++;
                var data_layer = this;
                var alpha = 0.5;
                if (!this.layout.label) {
                    // Guard against layout changing in the midst of iterative rerender
                    return;
                }
                var spacing = this.layout.label.spacing;
                var again = false;
                data_layer.label_texts.each(function () {
                    var a = this;
                    var da = d3.select(a);
                    var y1 = da.attr('y');
                    data_layer.label_texts.each(function () {
                        var b = this;
                        // a & b are the same element and don't collide.
                        if (a === b)
                            return;
                        var db = d3.select(b);
                        // a & b are on opposite sides of the chart and
                        // don't collide
                        if (da.attr('text-anchor') !== db.attr('text-anchor'))
                            return;
                        // Determine if the  bounding rects for the two text elements collide
                        var abound = da.node().getBoundingClientRect();
                        var bbound = db.node().getBoundingClientRect();
                        var collision = abound.left < bbound.left + bbound.width + 2 * spacing && abound.left + abound.width + 2 * spacing > bbound.left && abound.top < bbound.top + bbound.height + 2 * spacing && abound.height + abound.top + 2 * spacing > bbound.top;
                        if (!collision)
                            return;
                        again = true;
                        // If the labels collide, we'll push each
                        // of the two labels up and down a little bit.
                        var y2 = db.attr('y');
                        var sign = abound.top < bbound.top ? 1 : -1;
                        var adjust = sign * alpha;
                        var new_a_y = +y1 - adjust;
                        var new_b_y = +y2 + adjust;
                        // Keep new values from extending outside the data layer
                        var min_y = 2 * spacing;
                        var max_y = data_layer.parent.layout.height - data_layer.parent.layout.margin.top - data_layer.parent.layout.margin.bottom - 2 * spacing;
                        var delta;
                        if (new_a_y - abound.height / 2 < min_y) {
                            delta = +y1 - new_a_y;
                            new_a_y = +y1;
                            new_b_y += delta;
                        } else if (new_b_y - bbound.height / 2 < min_y) {
                            delta = +y2 - new_b_y;
                            new_b_y = +y2;
                            new_a_y += delta;
                        }
                        if (new_a_y + abound.height / 2 > max_y) {
                            delta = new_a_y - +y1;
                            new_a_y = +y1;
                            new_b_y -= delta;
                        } else if (new_b_y + bbound.height / 2 > max_y) {
                            delta = new_b_y - +y2;
                            new_b_y = +y2;
                            new_a_y -= delta;
                        }
                        da.attr('y', new_a_y);
                        db.attr('y', new_b_y);
                    });
                });
                if (again) {
                    // Adjust lines to follow the labels
                    if (data_layer.layout.label.lines) {
                        var label_elements = data_layer.label_texts[0];
                        data_layer.label_lines.attr('y2', function (d, i) {
                            var label_line = d3.select(label_elements[i]);
                            return label_line.attr('y');
                        });
                    }
                    // After ~150 iterations we're probably beyond diminising returns, so stop recursing
                    if (this.seperate_iterations < 150) {
                        setTimeout(function () {
                            this.separate_labels();
                        }.bind(this), 1);
                    }
                }
            };
            // Implement the main render function
            this.render = function () {
                var data_layer = this;
                var x_scale = 'x_scale';
                var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
                if (this.layout.label) {
                    // Apply filters to generate a filtered data set
                    var filtered_data = this.data.filter(function (d) {
                        if (!data_layer.layout.label.filters) {
                            return true;
                        } else {
                            // Start by assuming a match, run through all filters to test if not a match on any one
                            var match = true;
                            data_layer.layout.label.filters.forEach(function (filter) {
                                var field_value = new LocusZoom.Data.Field(filter.field).resolve(d);
                                if ([
                                        '!=',
                                        '='
                                    ].indexOf(filter.operator) === -1 && isNaN(field_value)) {
                                    // If the filter can only be used with numbers, then the value must be numeric.
                                    match = false;
                                } else {
                                    switch (filter.operator) {
                                    case '<':
                                        if (!(field_value < filter.value)) {
                                            match = false;
                                        }
                                        break;
                                    case '<=':
                                        if (!(field_value <= filter.value)) {
                                            match = false;
                                        }
                                        break;
                                    case '>':
                                        if (!(field_value > filter.value)) {
                                            match = false;
                                        }
                                        break;
                                    case '>=':
                                        if (!(field_value >= filter.value)) {
                                            match = false;
                                        }
                                        break;
                                    case '=':
                                        if (!(field_value === filter.value)) {
                                            match = false;
                                        }
                                        break;
                                    case '!=':
                                        // Deliberately allow weak comparisons to test for "anything with a value present" (null or undefined)
                                        // eslint-disable-next-line eqeqeq
                                        if (field_value == filter.value) {
                                            match = false;
                                        }
                                        break;
                                    default:
                                        // If we got here the operator is not valid, so the filter should fail
                                        match = false;
                                        break;
                                    }
                                }
                            });
                            return match;
                        }
                    });
                    // Render label groups
                    var self = this;
                    this.label_groups = this.svg.group.selectAll('g.lz-data_layer-' + this.layout.type + '-label').data(filtered_data, function (d) {
                        return d[self.layout.id_field] + '_label';
                    });
                    this.label_groups.enter().append('g').attr('class', 'lz-data_layer-' + this.layout.type + '-label');
                    // Render label texts
                    if (this.label_texts) {
                        this.label_texts.remove();
                    }
                    this.label_texts = this.label_groups.append('text').attr('class', 'lz-data_layer-' + this.layout.type + '-label');
                    this.label_texts.text(function (d) {
                        return LocusZoom.parseFields(d, data_layer.layout.label.text || '');
                    }).style(data_layer.layout.label.style || {}).attr({
                        'x': function (d) {
                            var x = data_layer.parent[x_scale](d[data_layer.layout.x_axis.field]) + Math.sqrt(data_layer.resolveScalableParameter(data_layer.layout.point_size, d)) + data_layer.layout.label.spacing;
                            if (isNaN(x)) {
                                x = -1000;
                            }
                            return x;
                        },
                        'y': function (d) {
                            var y = data_layer.parent[y_scale](d[data_layer.layout.y_axis.field]);
                            if (isNaN(y)) {
                                y = -1000;
                            }
                            return y;
                        },
                        'text-anchor': function () {
                            return 'start';
                        }
                    });
                    // Render label lines
                    if (data_layer.layout.label.lines) {
                        if (this.label_lines) {
                            this.label_lines.remove();
                        }
                        this.label_lines = this.label_groups.append('line').attr('class', 'lz-data_layer-' + this.layout.type + '-label');
                        this.label_lines.style(data_layer.layout.label.lines.style || {}).attr({
                            'x1': function (d) {
                                var x = data_layer.parent[x_scale](d[data_layer.layout.x_axis.field]);
                                if (isNaN(x)) {
                                    x = -1000;
                                }
                                return x;
                            },
                            'y1': function (d) {
                                var y = data_layer.parent[y_scale](d[data_layer.layout.y_axis.field]);
                                if (isNaN(y)) {
                                    y = -1000;
                                }
                                return y;
                            },
                            'x2': function (d) {
                                var x = data_layer.parent[x_scale](d[data_layer.layout.x_axis.field]) + Math.sqrt(data_layer.resolveScalableParameter(data_layer.layout.point_size, d)) + data_layer.layout.label.spacing / 2;
                                if (isNaN(x)) {
                                    x = -1000;
                                }
                                return x;
                            },
                            'y2': function (d) {
                                var y = data_layer.parent[y_scale](d[data_layer.layout.y_axis.field]);
                                if (isNaN(y)) {
                                    y = -1000;
                                }
                                return y;
                            }
                        });
                    }
                    // Remove labels when they're no longer in the filtered data set
                    this.label_groups.exit().remove();
                } else {
                    // If the layout definition has changed (& no longer specifies labels), strip any previously rendered
                    if (this.label_groups) {
                        this.label_groups.remove();
                    }
                    if (this.label_lines) {
                        this.label_lines.remove();
                    }
                }
                // Generate main scatter data elements
                var selection = this.svg.group.selectAll('path.lz-data_layer-' + this.layout.type).data(this.data, function (d) {
                    return d[this.layout.id_field];
                }.bind(this));
                // Create elements, apply class, ID, and initial position
                var initial_y = isNaN(this.parent.layout.height) ? 0 : this.parent.layout.height;
                selection.enter().append('path').attr('class', 'lz-data_layer-' + this.layout.type).attr('id', function (d) {
                    return this.getElementId(d);
                }.bind(this)).attr('transform', 'translate(0,' + initial_y + ')');
                // Generate new values (or functions for them) for position, color, size, and shape
                var transform = function (d) {
                    var x = this.parent[x_scale](d[this.layout.x_axis.field]);
                    var y = this.parent[y_scale](d[this.layout.y_axis.field]);
                    if (isNaN(x)) {
                        x = -1000;
                    }
                    if (isNaN(y)) {
                        y = -1000;
                    }
                    return 'translate(' + x + ',' + y + ')';
                }.bind(this);
                var fill = function (d) {
                    return this.resolveScalableParameter(this.layout.color, d);
                }.bind(this);
                var fill_opacity = function (d) {
                    return this.resolveScalableParameter(this.layout.fill_opacity, d);
                }.bind(this);
                var shape = d3.svg.symbol().size(function (d) {
                    return this.resolveScalableParameter(this.layout.point_size, d);
                }.bind(this)).type(function (d) {
                    return this.resolveScalableParameter(this.layout.point_shape, d);
                }.bind(this));
                // Apply position and color, using a transition if necessary
                if (this.canTransition()) {
                    selection.transition().duration(this.layout.transition.duration || 0).ease(this.layout.transition.ease || 'cubic-in-out').attr('transform', transform).attr('fill', fill).attr('fill-opacity', fill_opacity).attr('d', shape);
                } else {
                    selection.attr('transform', transform).attr('fill', fill).attr('fill-opacity', fill_opacity).attr('d', shape);
                }
                // Remove old elements as needed
                selection.exit().remove();
                // Apply default event emitters to selection
                selection.on('click.event_emitter', function (element) {
                    this.parent.emit('element_clicked', element, true);
                }.bind(this));
                // Apply mouse behaviors
                this.applyBehaviors(selection);
                // Apply method to keep labels from overlapping each other
                if (this.layout.label) {
                    this.flip_labels();
                    this.seperate_iterations = 0;
                    this.separate_labels();
                    // Apply default event emitters to selection
                    this.label_texts.on('click.event_emitter', function (element) {
                        this.parent.emit('element_clicked', element, true);
                    }.bind(this));
                    // Extend mouse behaviors to labels
                    this.applyBehaviors(this.label_texts);
                }
            };
            // Method to set a passed element as the LD reference in the plot-level state
            this.makeLDReference = function (element) {
                var ref = null;
                if (typeof element == 'undefined') {
                    throw 'makeLDReference requires one argument of any type';
                } else if (typeof element == 'object') {
                    if (this.layout.id_field && typeof element[this.layout.id_field] != 'undefined') {
                        ref = element[this.layout.id_field].toString();
                    } else if (typeof element['id'] != 'undefined') {
                        ref = element['id'].toString();
                    } else {
                        ref = element.toString();
                    }
                } else {
                    ref = element.toString();
                }
                this.parent_plot.applyState({ ldrefvar: ref });
            };
            return this;
        });
        /**
 * A scatter plot in which the x-axis represents categories, rather than individual positions.
 * For example, this can be used by PheWAS plots to show related groups. This plot allows the categories to be
 *   determined dynamically when data is first loaded.
 *
 * @class LocusZoom.DataLayers.category_scatter
 * @augments LocusZoom.DataLayers.scatter
 */
        LocusZoom.DataLayers.extend('scatter', 'category_scatter', {
            /**
     * This plot layer makes certain assumptions about the data passed in. Transform the raw array of records from
     *   the datasource to prepare it for plotting, as follows:
     * 1. The scatter plot assumes that all records are given in sequence (pre-grouped by `category_field`)
     * 2. It assumes that all records have an x coordinate for individual plotting
     * @private
     */
            _prepareData: function () {
                var xField = this.layout.x_axis.field || 'x';
                // The (namespaced) field from `this.data` that will be used to assign datapoints to a given category & color
                var category_field = this.layout.x_axis.category_field;
                if (!category_field) {
                    throw 'Layout for ' + this.layout.id + ' must specify category_field';
                }
                // Sort the data so that things in the same category are adjacent (case-insensitive by specified field)
                var sourceData = this.data.sort(function (a, b) {
                    var ak = a[category_field];
                    var bk = b[category_field];
                    var av = ak.toString ? ak.toString().toLowerCase() : ak;
                    var bv = bk.toString ? bk.toString().toLowerCase() : bk;
                    return av === bv ? 0 : av < bv ? -1 : 1;
                });
                sourceData.forEach(function (d, i) {
                    // Implementation detail: Scatter plot requires specifying an x-axis value, and most datasources do not
                    //   specify plotting positions. If a point is missing this field, fill in a synthetic value.
                    d[xField] = d[xField] || i;
                });
                return sourceData;
            },
            /**
     * Identify the unique categories on the plot, and update the layout with an appropriate color scheme.
     * Also identify the min and max x value associated with the category, which will be used to generate ticks
     * @private
     * @returns {Object.<String, Number[]>} Series of entries used to build category name ticks {category_name: [min_x, max_x]}
     */
            _generateCategoryBounds: function () {
                // TODO: API may return null values in category_field; should we add placeholder category label?
                // The (namespaced) field from `this.data` that will be used to assign datapoints to a given category & color
                var category_field = this.layout.x_axis.category_field;
                var xField = this.layout.x_axis.field || 'x';
                var uniqueCategories = {};
                this.data.forEach(function (item) {
                    var category = item[category_field];
                    var x = item[xField];
                    var bounds = uniqueCategories[category] || [
                        x,
                        x
                    ];
                    uniqueCategories[category] = [
                        Math.min(bounds[0], x),
                        Math.max(bounds[1], x)
                    ];
                });
                var categoryNames = Object.keys(uniqueCategories);
                this._setDynamicColorScheme(categoryNames);
                return uniqueCategories;
            },
            /**
     * Automatically define a color scheme for the layer based on data returned from the server.
     *   If part of the color scheme has been specified, it will fill in remaining missing information.
     *
     * There are three scenarios:
     * 1. The layout does not specify either category names or (color) values. Dynamically build both based on
     *    the data and update the layout.
     * 2. The layout specifies colors, but not categories. Use that exact color information provided, and dynamically
     *     determine what categories are present in the data. (cycle through the available colors, reusing if there
     *     are a lot of categories)
     * 3. The layout specifies exactly what colors and categories to use (and they match the data!). This is useful to
     *    specify an explicit mapping between color scheme and category names, when you want to be sure that the
     *    plot matches a standard color scheme.
     *    (If the layout specifies categories that do not match the data, the user specified categories will be ignored)
     *
     * This method will only act if the layout defines a `categorical_bin` scale function for coloring. It may be
     *   overridden in a subclass to suit other types of coloring methods.
     *
     * @param {String[]} categoryNames
     * @private
     */
            _setDynamicColorScheme: function (categoryNames) {
                var colorParams = this.layout.color.parameters;
                var baseParams = this._base_layout.color.parameters;
                // If the layout does not use a supported coloring scheme, or is already complete, this method should do nothing
                if (this.layout.color.scale_function !== 'categorical_bin') {
                    throw 'This layer requires that coloring be specified as a `categorical_bin`';
                }
                if (baseParams.categories.length && baseParams.values.length) {
                    // If there are preset category/color combos, make sure that they apply to the actual dataset
                    var parameters_categories_hash = {};
                    baseParams.categories.forEach(function (category) {
                        parameters_categories_hash[category] = 1;
                    });
                    if (categoryNames.every(function (name) {
                            return parameters_categories_hash.hasOwnProperty(name);
                        })) {
                        // The layout doesn't have to specify categories in order, but make sure they are all there
                        colorParams.categories = baseParams.categories;
                    } else {
                        colorParams.categories = categoryNames;
                    }
                } else {
                    colorParams.categories = categoryNames;
                }
                // Prefer user-specified colors if provided. Make sure that there are enough colors for all the categories.
                var colors;
                if (baseParams.values.length) {
                    colors = baseParams.values;
                } else {
                    var color_scale = categoryNames.length <= 10 ? d3.scale.category10 : d3.scale.category20;
                    colors = color_scale().range();
                }
                while (colors.length < categoryNames.length) {
                    colors = colors.concat(colors);
                }
                colors = colors.slice(0, categoryNames.length);
                // List of hex values, should be of same length as categories array
                colorParams.values = colors;
            },
            /**
     *
     * @param dimension
     * @param {Object} [config] Parameters that customize how ticks are calculated (not style)
     * @param {('left'|'center'|'right')} [config.position='left'] Align ticks with the center or edge of category
     * @returns {Array}
     */
            getTicks: function (dimension, config) {
                // Overrides parent method
                if ([
                        'x',
                        'y1',
                        'y2'
                    ].indexOf(dimension) === -1) {
                    throw 'Invalid dimension identifier';
                }
                var position = config.position || 'left';
                if ([
                        'left',
                        'center',
                        'right'
                    ].indexOf(position) === -1) {
                    throw 'Invalid tick position';
                }
                var categoryBounds = this._categories;
                if (!categoryBounds || !Object.keys(categoryBounds).length) {
                    return [];
                }
                if (dimension === 'y') {
                    return [];
                }
                if (dimension === 'x') {
                    // If colors have been defined by this layer, use them to make tick colors match scatterplot point colors
                    var knownCategories = this.layout.color.parameters.categories || [];
                    var knownColors = this.layout.color.parameters.values || [];
                    return Object.keys(categoryBounds).map(function (category, index) {
                        var bounds = categoryBounds[category];
                        var xPos;
                        switch (position) {
                        case 'left':
                            xPos = bounds[0];
                            break;
                        case 'center':
                            // Center tick under one or many elements as appropriate
                            var diff = bounds[1] - bounds[0];
                            xPos = bounds[0] + (diff !== 0 ? diff : bounds[0]) / 2;
                            break;
                        case 'right':
                            xPos = bounds[1];
                            break;
                        }
                        return {
                            x: xPos,
                            text: category,
                            style: { 'fill': knownColors[knownCategories.indexOf(category)] || '#000000' }
                        };
                    });
                }
            },
            applyCustomDataMethods: function () {
                this.data = this._prepareData();
                /**
         * Define category names and extents (boundaries) for plotting.  TODO: properties in constructor
         * @member {Object.<String, Number[]>} Category names and extents, in the form {category_name: [min_x, max_x]}
         */
                this._categories = this._generateCategoryBounds();
                return this;
            }
        });
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
        LocusZoom.KnownDataSources = function () {
            /** @lends LocusZoom.KnownDataSources */
            var obj = {};
            /* @member {function[]} */
            var sources = [];
            var findSourceByName = function (x) {
                for (var i = 0; i < sources.length; i++) {
                    if (!sources[i].SOURCE_NAME) {
                        throw 'KnownDataSources at position ' + i + ' does not have a \'SOURCE_NAME\' static property';
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
            obj.get = function (name) {
                return findSourceByName(name);
            };
            /**
     * Register a data source constructor so that it may be located by name
     * @param {function} source A constructor function for a data source; will usually extend `Data.Source`,
     *   and should have a `SOURCE_NAME` property
     */
            obj.add = function (source) {
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
            obj.extend = function (parent_name, source_name, overrides) {
                var parent = findSourceByName(parent_name);
                if (!parent) {
                    throw 'Attempted to subclass an unknown or unregistered data source';
                }
                if (!source_name) {
                    throw 'Must provide a name for the new data source';
                }
                if (typeof overrides !== 'object') {
                    throw 'Must specify an object of properties and methods';
                }
                var child = LocusZoom.subclass(parent, overrides);
                child.SOURCE_NAME = source_name;
                sources.push(child);
                return child;
            };
            /** @deprecated */
            obj.push = function (source) {
                console.warn('Warning: KnownDataSources.push() is deprecated. Use .add() instead');
                obj.add(source);
            };
            /**
     * List the names of all registered datasources
     * @returns {String[]}
     */
            obj.list = function () {
                return sources.map(function (x) {
                    return x.SOURCE_NAME;
                });
            };
            /**
     * Create a datasource instance
     * @param {String} name The name of the desired datasource to instantiate (must be defined in the registry)
     * @returns {LocusZoom.Data.Source}
     */
            obj.create = function (name) {
                //create new object (pass additional parameters to constructor)
                var newObj = findSourceByName(name);
                if (newObj) {
                    var params = arguments;
                    params[0] = null;
                    return new (Function.prototype.bind.apply(newObj, params))();
                } else {
                    throw 'Unable to find data source for name: ' + name;
                }
            };
            /**
     * Get the array of all registered constructors
     *   Generally only used for unit tests internally
     * @private
     * @returns {function[]}
     */
            obj.getAll = function () {
                return sources;
            };
            /**
     * Register an entire collection of data sources
     *   Generally only used for unit tests internally
     * @private
     * @param {function[]} x An array of datasource constructors
     */
            obj.setAll = function (x) {
                sources = x;
            };
            /**
     * Unregister all known data sources
     *   Generally only used for unit tests internally
     * @private
     */
            obj.clear = function () {
                sources = [];
            };
            return obj;
        }();
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
        LocusZoom.TransformationFunctions = function () {
            /** @lends LocusZoom.TransformationFunctions */
            var obj = {};
            var transformations = {};
            var getTrans = function (name) {
                if (!name) {
                    return null;
                }
                var fun = transformations[name];
                if (fun) {
                    return fun;
                } else {
                    throw 'transformation ' + name + ' not found';
                }
            };
            //a single transformation with any parameters
            //(parameters not currently supported)
            var parseTrans = function (name) {
                return getTrans(name);
            };
            //a "raw" transformation string with a leading pipe
            //and one or more transformations
            var parseTransString = function (x) {
                var funs = [];
                var re = /\|([^|]+)/g;
                var result;
                while ((result = re.exec(x)) !== null) {
                    funs.push(result[1]);
                }
                if (funs.length === 1) {
                    return parseTrans(funs[0]);
                } else if (funs.length > 1) {
                    return function (x) {
                        var val = x;
                        for (var i = 0; i < funs.length; i++) {
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
            obj.get = function (name) {
                if (name && name.substring(0, 1) === '|') {
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
            obj.set = function (name, fn) {
                if (name.substring(0, 1) === '|') {
                    throw 'transformation name should not start with a pipe';
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
            obj.add = function (name, fn) {
                if (transformations[name]) {
                    throw 'transformation already exists with name: ' + name;
                } else {
                    obj.set(name, fn);
                }
            };
            /**
     * List the names of all registered transformation functions
     * @returns {String[]}
     */
            obj.list = function () {
                return Object.keys(transformations);
            };
            return obj;
        }();
        /**
 * Return the -log (base 10)
 * @function neglog10
 */
        LocusZoom.TransformationFunctions.add('neglog10', function (x) {
            if (isNaN(x) || x <= 0) {
                return null;
            }
            return -Math.log(x) / Math.LN10;
        });
        /**
 * Convert a number from logarithm to scientific notation. Useful for, eg, a datasource that returns -log(p) by default
 * @function logtoscinotation
 */
        LocusZoom.TransformationFunctions.add('logtoscinotation', function (x) {
            if (isNaN(x)) {
                return 'NaN';
            }
            if (x === 0) {
                return '1';
            }
            var exp = Math.ceil(x);
            var diff = exp - x;
            var base = Math.pow(10, diff);
            if (exp === 1) {
                return (base / 10).toFixed(4);
            } else if (exp === 2) {
                return (base / 100).toFixed(3);
            } else {
                return base.toFixed(2) + ' \xD7 10^-' + exp;
            }
        });
        /**
 * Represent a number in scientific notation
 * @function scinotation
 * @param {Number} x
 * @returns {String}
 */
        LocusZoom.TransformationFunctions.add('scinotation', function (x) {
            if (isNaN(x)) {
                return 'NaN';
            }
            if (x === 0) {
                return '0';
            }
            var abs = Math.abs(x);
            var log;
            if (abs > 1) {
                log = Math.ceil(Math.log(abs) / Math.LN10);
            } else {
                // 0...1
                log = Math.floor(Math.log(abs) / Math.LN10);
            }
            if (Math.abs(log) <= 3) {
                return x.toFixed(3);
            } else {
                return x.toExponential(2).replace('+', '').replace('e', ' \xD7 10^');
            }
        });
        /**
 * URL-encode the provided text, eg for constructing hyperlinks
 * @function urlencode
 * @param {String} str
 */
        LocusZoom.TransformationFunctions.add('urlencode', function (str) {
            return encodeURIComponent(str);
        });
        /**
 * HTML-escape user entered values for use in constructed HTML fragments
 *
 * For example, this filter can be used on tooltips with custom HTML display
 * @function htmlescape
 * @param {String} str HTML-escape the provided value
 */
        LocusZoom.TransformationFunctions.add('htmlescape', function (str) {
            if (!str) {
                return '';
            }
            str = str + '';
            return str.replace(/['"<>&`]/g, function (s) {
                switch (s) {
                case '\'':
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
        LocusZoom.ScaleFunctions = function () {
            /** @lends LocusZoom.ScaleFunctions */
            var obj = {};
            var functions = {};
            /**
     * Find a scale function and return it. If parameters and values are passed, calls the function directly; otherwise
     *   returns a callable.
     * @param {String} name
     * @param {Object} [parameters] Configuration parameters specific to the specified scale function
     * @param {*} [value] The value to operate on
     * @returns {*}
     */
            obj.get = function (name, parameters, value) {
                if (!name) {
                    return null;
                } else if (functions[name]) {
                    if (typeof parameters === 'undefined' && typeof value === 'undefined') {
                        return functions[name];
                    } else {
                        return functions[name](parameters, value);
                    }
                } else {
                    throw 'scale function [' + name + '] not found';
                }
            };
            /**
     * @protected
     * @param {String} name The name of the function to set/unset
     * @param {Function} [fn] The function to register. If blank, removes this function name from the registry.
     */
            obj.set = function (name, fn) {
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
            obj.add = function (name, fn) {
                if (functions[name]) {
                    throw 'scale function already exists with name: ' + name;
                } else {
                    obj.set(name, fn);
                }
            };
            /**
     * List the names of all registered scale functions
     * @returns {String[]}
     */
            obj.list = function () {
                return Object.keys(functions);
            };
            return obj;
        }();
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
        LocusZoom.ScaleFunctions.add('if', function (parameters, input) {
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
        LocusZoom.ScaleFunctions.add('numerical_bin', function (parameters, input) {
            var breaks = parameters.breaks || [];
            var values = parameters.values || [];
            if (typeof input == 'undefined' || input === null || isNaN(+input)) {
                return parameters.null_value ? parameters.null_value : null;
            }
            var threshold = breaks.reduce(function (prev, curr) {
                if (+input < prev || +input >= prev && +input < curr) {
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
        LocusZoom.ScaleFunctions.add('categorical_bin', function (parameters, value) {
            if (typeof value == 'undefined' || parameters.categories.indexOf(value) === -1) {
                return parameters.null_value ? parameters.null_value : null;
            } else {
                return parameters.values[parameters.categories.indexOf(value)];
            }
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
        LocusZoom.ScaleFunctions.add('interpolate', function (parameters, input) {
            var breaks = parameters.breaks || [];
            var values = parameters.values || [];
            var nullval = parameters.null_value ? parameters.null_value : null;
            if (breaks.length < 2 || breaks.length !== values.length) {
                return nullval;
            }
            if (typeof input == 'undefined' || input === null || isNaN(+input)) {
                return nullval;
            }
            if (+input <= parameters.breaks[0]) {
                return values[0];
            } else if (+input >= parameters.breaks[parameters.breaks.length - 1]) {
                return values[breaks.length - 1];
            } else {
                var upper_idx = null;
                breaks.forEach(function (brk, idx) {
                    if (!idx) {
                        return;
                    }
                    if (breaks[idx - 1] <= +input && breaks[idx] >= +input) {
                        upper_idx = idx;
                    }
                });
                if (upper_idx === null) {
                    return nullval;
                }
                var normalized_input = (+input - breaks[upper_idx - 1]) / (breaks[upper_idx] - breaks[upper_idx - 1]);
                if (!isFinite(normalized_input)) {
                    return nullval;
                }
                return d3.interpolate(values[upper_idx - 1], values[upper_idx])(normalized_input);
            }
        });
        /* global LocusZoom */
        'use strict';
        /**
 * A Dashboard is an HTML element used for presenting arbitrary user interface components. Dashboards are anchored
 *   to either the entire Plot or to individual Panels.
 *
 * Each dashboard is an HTML-based (read: not SVG) collection of components used to display information or provide
 *   user interface. Dashboards can exist on entire plots, where their visibility is permanent and vertically adjacent
 *   to the plot, or on individual panels, where their visibility is tied to a behavior (e.g. a mouseover) and is as
 *   an overlay.
 * @class
 */
        LocusZoom.Dashboard = function (parent) {
            // parent must be a locuszoom plot or panel
            if (!(parent instanceof LocusZoom.Plot) && !(parent instanceof LocusZoom.Panel)) {
                throw 'Unable to create dashboard, parent must be a locuszoom plot or panel';
            }
            /** @member {LocusZoom.Plot|LocusZoom.Panel} */
            this.parent = parent;
            /** @member {String} */
            this.id = this.parent.getBaseId() + '.dashboard';
            /** @member {('plot'|'panel')} */
            this.type = this.parent instanceof LocusZoom.Plot ? 'plot' : 'panel';
            /** @member {LocusZoom.Plot} */
            this.parent_plot = this.type === 'plot' ? this.parent : this.parent.parent;
            /** @member {d3.selection} */
            this.selector = null;
            /** @member {LocusZoom.Dashboard.Component[]} */
            this.components = [];
            /**
     * The timer identifier as returned by setTimeout
     * @member {Number}
     */
            this.hide_timeout = null;
            /**
     * Whether to hide the dashboard. Can be overridden by a child component. Check via `shouldPersist`
     * @protected
     * @member {Boolean}
     */
            this.persist = false;
            // TODO: Return value from constructor function?
            return this.initialize();
        };
        /**
 * Prepare the dashboard for first use: generate all component instances for this dashboard, based on the provided
 *   layout of the parent. Connects event listeners and shows/hides as appropriate.
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.prototype.initialize = function () {
            // Parse layout to generate component instances
            if (Array.isArray(this.parent.layout.dashboard.components)) {
                this.parent.layout.dashboard.components.forEach(function (layout) {
                    try {
                        var component = LocusZoom.Dashboard.Components.get(layout.type, layout, this);
                        this.components.push(component);
                    } catch (e) {
                        console.warn(e);
                    }
                }.bind(this));
            }
            // Add mouseover event handlers to show/hide panel dashboard
            if (this.type === 'panel') {
                d3.select(this.parent.parent.svg.node().parentNode).on('mouseover.' + this.id, function () {
                    clearTimeout(this.hide_timeout);
                    if (!this.selector || this.selector.style('visibility') === 'hidden') {
                        this.show();
                    }
                }.bind(this));
                d3.select(this.parent.parent.svg.node().parentNode).on('mouseout.' + this.id, function () {
                    clearTimeout(this.hide_timeout);
                    this.hide_timeout = setTimeout(function () {
                        this.hide();
                    }.bind(this), 300);
                }.bind(this));
            }
            return this;
        };
        /**
 * Whether to persist the dashboard. Returns true if at least one component should persist, or if the panel is engaged
 *   in an active drag event.
 * @returns {boolean}
 */
        LocusZoom.Dashboard.prototype.shouldPersist = function () {
            if (this.persist) {
                return true;
            }
            var persist = false;
            // Persist if at least one component should also persist
            this.components.forEach(function (component) {
                persist = persist || component.shouldPersist();
            });
            // Persist if in a parent drag event
            persist = persist || (this.parent_plot.panel_boundaries.dragging || this.parent_plot.interaction.dragging);
            return !!persist;
        };
        /**
 * Make the dashboard appear. If it doesn't exist yet create it, including creating/positioning all components within,
 *   and make sure it is set to be visible.
 */
        LocusZoom.Dashboard.prototype.show = function () {
            if (!this.selector) {
                switch (this.type) {
                case 'plot':
                    this.selector = d3.select(this.parent.svg.node().parentNode).insert('div', ':first-child');
                    break;
                case 'panel':
                    this.selector = d3.select(this.parent.parent.svg.node().parentNode).insert('div', '.lz-data_layer-tooltip, .lz-dashboard-menu, .lz-curtain').classed('lz-panel-dashboard', true);
                    break;
                }
                this.selector.classed('lz-dashboard', true).classed('lz-' + this.type + '-dashboard', true).attr('id', this.id);
            }
            this.components.forEach(function (component) {
                component.show();
            });
            this.selector.style({ visibility: 'visible' });
            return this.update();
        };
        /**
 * Update the dashboard and rerender all child components. This can be called whenever plot state changes.
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.prototype.update = function () {
            if (!this.selector) {
                return this;
            }
            this.components.forEach(function (component) {
                component.update();
            });
            return this.position();
        };
        /**
 * Position the dashboard (and child components) within the panel
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.prototype.position = function () {
            if (!this.selector) {
                return this;
            }
            // Position the dashboard itself (panel only)
            if (this.type === 'panel') {
                var page_origin = this.parent.getPageOrigin();
                var top = (page_origin.y + 3.5).toString() + 'px';
                var left = page_origin.x.toString() + 'px';
                var width = (this.parent.layout.width - 4).toString() + 'px';
                this.selector.style({
                    position: 'absolute',
                    top: top,
                    left: left,
                    width: width
                });
            }
            // Recursively position components
            this.components.forEach(function (component) {
                component.position();
            });
            return this;
        };
        /**
 * Hide the dashboard (make invisible but do not destroy). Will do nothing if `shouldPersist` returns true.
 *
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.prototype.hide = function () {
            if (!this.selector || this.shouldPersist()) {
                return this;
            }
            this.components.forEach(function (component) {
                component.hide();
            });
            this.selector.style({ visibility: 'hidden' });
            return this;
        };
        /**
 * Completely remove dashboard and all child components. (may be overridden by persistence settings)
 * @param {Boolean} [force=false] If true, will ignore persistence settings and always destroy the dashboard
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.prototype.destroy = function (force) {
            if (typeof force == 'undefined') {
                force = false;
            }
            if (!this.selector) {
                return this;
            }
            if (this.shouldPersist() && !force) {
                return this;
            }
            this.components.forEach(function (component) {
                component.destroy(true);
            });
            this.components = [];
            this.selector.remove();
            this.selector = null;
            return this;
        };
        /**
 *
 * A dashboard component is an empty div rendered on a dashboard that can display custom
 * html of user interface elements. LocusZoom.Dashboard.Components is a singleton used to
 * define and manage an extendable collection of dashboard components.
 * (e.g. by LocusZoom.Dashboard.Components.add())
 * @class
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
 * @param {('left'|'right')} [layout.position='left']  Whether to float the component left or right.
 * @param {('start'|'middle'|'end')} [layout.group_position] Buttons can optionally be gathered into a visually
 *  distinctive group whose elements are closer together. If a button is identified as the start or end of a group,
 *  it will be drawn with rounded corners and an extra margin of spacing from any button not part of the group.
 *  For example, the region_nav_plot dashboard is a defined as a group.
 * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple'} [layout.color='gray']  Color scheme for the
 *   component. Applies to buttons and menus.
 * @param {LocusZoom.Dashboard} parent The dashboard that contains this component
*/
        LocusZoom.Dashboard.Component = function (layout, parent) {
            /** @member {Object} */
            this.layout = layout || {};
            if (!this.layout.color) {
                this.layout.color = 'gray';
            }
            /** @member {LocusZoom.Dashboard|*} */
            this.parent = parent || null;
            /**
     * Some dashboards are attached to a panel, rather than directly to a plot
     * @member {LocusZoom.Panel|null}
     */
            this.parent_panel = null;
            /** @member {LocusZoom.Plot} */
            this.parent_plot = null;
            /**
     * This is a reference to either the panel or the plot, depending on what the dashboard is
     *   tied to. Useful when absolutely positioning dashboard components relative to their SVG anchor.
     * @member {LocusZoom.Plot|LocusZoom.Panel}
     */
            this.parent_svg = null;
            if (this.parent instanceof LocusZoom.Dashboard) {
                // TODO: when is the immediate parent *not* a dashboard?
                if (this.parent.type === 'panel') {
                    this.parent_panel = this.parent.parent;
                    this.parent_plot = this.parent.parent.parent;
                    this.parent_svg = this.parent_panel;
                } else {
                    this.parent_plot = this.parent.parent;
                    this.parent_svg = this.parent_plot;
                }
            }
            /** @member {d3.selection} */
            this.selector = null;
            /**
     * If this is an interactive component, it will contain a button or menu instance that handles the interactivity.
     *   There is a 1-to-1 relationship of dashboard component to button
     * @member {null|LocusZoom.Dashboard.Component.Button}
     */
            this.button = null;
            /**
     * If any single component is marked persistent, it will bubble up to prevent automatic hide behavior on a
     *   component's parent dashboard. Check via `shouldPersist`
     * @protected
     * @member {Boolean}
     */
            this.persist = false;
            if (!this.layout.position) {
                this.layout.position = 'left';
            }
            // TODO: Return value in constructor
            return this;
        };
        /**
 * Perform all rendering of component, including toggling visibility to true. Will initialize and create SVG element
 *   if necessary, as well as updating with new data and performing layout actions.
 */
        LocusZoom.Dashboard.Component.prototype.show = function () {
            if (!this.parent || !this.parent.selector) {
                return;
            }
            if (!this.selector) {
                var group_position = [
                    'start',
                    'middle',
                    'end'
                ].indexOf(this.layout.group_position) !== -1 ? ' lz-dashboard-group-' + this.layout.group_position : '';
                this.selector = this.parent.selector.append('div').attr('class', 'lz-dashboard-' + this.layout.position + group_position);
                if (this.layout.style) {
                    this.selector.style(this.layout.style);
                }
                if (typeof this.initialize == 'function') {
                    this.initialize();
                }
            }
            if (this.button && this.button.status === 'highlighted') {
                this.button.menu.show();
            }
            this.selector.style({ visibility: 'visible' });
            this.update();
            return this.position();
        };
        /**
 * Update the dashboard component with any new data or plot state as appropriate. This method performs all
 *  necessary rendering steps.
 */
        LocusZoom.Dashboard.Component.prototype.update = function () {
        };
        /**
 * Place the component correctly in the plot
 * @returns {LocusZoom.Dashboard.Component}
 */
        LocusZoom.Dashboard.Component.prototype.position = function () {
            if (this.button) {
                this.button.menu.position();
            }
            return this;
        };
        /**
 * Determine whether the component should persist (will bubble up to parent dashboard)
 * @returns {boolean}
 */
        LocusZoom.Dashboard.Component.prototype.shouldPersist = function () {
            if (this.persist) {
                return true;
            }
            if (this.button && this.button.persist) {
                return true;
            }
            return false;
        };
        /**
 * Toggle visibility to hidden, unless marked as persistent
 * @returns {LocusZoom.Dashboard.Component}
 */
        LocusZoom.Dashboard.Component.prototype.hide = function () {
            if (!this.selector || this.shouldPersist()) {
                return this;
            }
            if (this.button) {
                this.button.menu.hide();
            }
            this.selector.style({ visibility: 'hidden' });
            return this;
        };
        /**
 * Completely remove component and button. (may be overridden by persistence settings)
 * @param {Boolean} [force=false] If true, will ignore persistence settings and always destroy the dashboard
 * @returns {LocusZoom.Dashboard}
 */
        LocusZoom.Dashboard.Component.prototype.destroy = function (force) {
            if (typeof force == 'undefined') {
                force = false;
            }
            if (!this.selector) {
                return this;
            }
            if (this.shouldPersist() && !force) {
                return this;
            }
            if (this.button && this.button.menu) {
                this.button.menu.destroy();
            }
            this.selector.remove();
            this.selector = null;
            this.button = null;
            return this;
        };
        /**
 * Singleton registry of all known components
 * @class
 * @static
 */
        LocusZoom.Dashboard.Components = function () {
            /** @lends LocusZoom.Dashboard.Components */
            var obj = {};
            var components = {};
            /**
     * Create a new component instance by name
     * @param {String} name The string identifier of the desired component
     * @param {Object} layout The layout to use to create the component
     * @param {LocusZoom.Dashboard} parent The containing dashboard to use when creating the component
     * @returns {LocusZoom.Dashboard.Component}
     */
            obj.get = function (name, layout, parent) {
                if (!name) {
                    return null;
                } else if (components[name]) {
                    if (typeof layout != 'object') {
                        throw 'invalid layout argument for dashboard component [' + name + ']';
                    } else {
                        return new components[name](layout, parent);
                    }
                } else {
                    throw 'dashboard component [' + name + '] not found';
                }
            };
            /**
     * Add a new component constructor to the registry and ensure that it extends the correct parent class
     * @protected
     * @param name
     * @param component
     */
            obj.set = function (name, component) {
                if (component) {
                    if (typeof component != 'function') {
                        throw 'unable to set dashboard component [' + name + '], argument provided is not a function';
                    } else {
                        components[name] = component;
                        components[name].prototype = new LocusZoom.Dashboard.Component();
                    }
                } else {
                    delete components[name];
                }
            };
            /**
     * Register a new component constructor by name
     * @param {String} name
     * @param {function} component The component constructor
     */
            obj.add = function (name, component) {
                if (components[name]) {
                    throw 'dashboard component already exists with name: ' + name;
                } else {
                    obj.set(name, component);
                }
            };
            /**
     * List the names of all registered components
     * @returns {String[]}
     */
            obj.list = function () {
                return Object.keys(components);
            };
            return obj;
        }();
        /**
 * Plots and panels may have a "dashboard" element suited for showing HTML components that may be interactive.
 *   When components need to incorporate a generic button, or additionally a button that generates a menu, this
 *   class provides much of the necessary framework.
 * @class
 * @param {LocusZoom.Dashboard.Component} parent
 */
        LocusZoom.Dashboard.Component.Button = function (parent) {
            if (!(parent instanceof LocusZoom.Dashboard.Component)) {
                throw 'Unable to create dashboard component button, invalid parent';
            }
            /** @member {LocusZoom.Dashboard.Component} */
            this.parent = parent;
            /** @member {LocusZoom.Dashboard.Panel} */
            this.parent_panel = this.parent.parent_panel;
            /** @member {LocusZoom.Dashboard.Plot} */
            this.parent_plot = this.parent.parent_plot;
            /** @member {LocusZoom.Plot|LocusZoom.Panel} */
            this.parent_svg = this.parent.parent_svg;
            /** @member {LocusZoom.Dashboard|null|*} */
            this.parent_dashboard = this.parent.parent;
            /** @member {d3.selection} */
            this.selector = null;
            /**
     * Tag to use for the button (default: a)
     * @member {String}
     */
            this.tag = 'a';
            /**
     * TODO This method does not appear to be used anywhere
     * @param {String} tag
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setTag = function (tag) {
                if (typeof tag != 'undefined') {
                    this.tag = tag.toString();
                }
                return this;
            };
            /**
     * HTML for the button to show.
     * @protected
     * @member {String}
     */
            this.html = '';
            /**
     * Specify the HTML content of this button.
     * WARNING: The string provided will be inserted into the document as raw markup; XSS mitigation is the
     *   responsibility of each button implementation.
     * @param {String} html
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setHtml = function (html) {
                if (typeof html != 'undefined') {
                    this.html = html.toString();
                }
                return this;
            };
            /**
     * @deprecated since 0.5.6; use setHtml instead
     */
            this.setText = this.setHtml;
            /**
     * Mouseover title text for the button to show
     * @protected
     * @member {String}
     */
            this.title = '';
            /**
     * Set the mouseover title text for the button (if any)
     * @param {String} title Simple text to display
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setTitle = function (title) {
                if (typeof title != 'undefined') {
                    this.title = title.toString();
                }
                return this;
            };
            /**
     * Color of the button
     * @member {String}
     */
            this.color = 'gray';
            /**
     * Set the color associated with this button
     * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple')} color Any selection not in the preset list
     *   will be replaced with gray.
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setColor = function (color) {
                if (typeof color != 'undefined') {
                    if ([
                            'gray',
                            'red',
                            'orange',
                            'yellow',
                            'green',
                            'blue',
                            'purple'
                        ].indexOf(color) !== -1) {
                        this.color = color;
                    } else {
                        this.color = 'gray';
                    }
                }
                return this;
            };
            /**
     * Hash of arbitrary button styles to apply as {name: value} entries
     * @protected
     * @member {Object}
     */
            this.style = {};
            /**
     * Set a collection of custom styles to be used by the button
     * @param {Object} style Hash of {name:value} entries
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setStyle = function (style) {
                if (typeof style != 'undefined') {
                    this.style = style;
                }
                return this;
            };
            //
            /**
     * Method to generate a CSS class string
     * @returns {string}
     */
            this.getClass = function () {
                var group_position = [
                    'start',
                    'middle',
                    'end'
                ].indexOf(this.parent.layout.group_position) !== -1 ? ' lz-dashboard-button-group-' + this.parent.layout.group_position : '';
                return 'lz-dashboard-button lz-dashboard-button-' + this.color + (this.status ? '-' + this.status : '') + group_position;
            };
            // Permanence
            /**
     * Track internal state on whether to keep showing the button/ menu contents at the moment
     * @protected
     * @member {Boolean}
     */
            this.persist = false;
            /**
     * Configuration when defining a button: track whether this component should be allowed to keep open
     *   menu/button contents in response to certain events
     * @protected
     * @member {Boolean}
     */
            this.permanent = false;
            /**
     * Allow code to change whether the button is allowed to be `permanent`
     * @param {boolean} bool
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.setPermanent = function (bool) {
                if (typeof bool == 'undefined') {
                    bool = true;
                } else {
                    bool = Boolean(bool);
                }
                this.permanent = bool;
                if (this.permanent) {
                    this.persist = true;
                }
                return this;
            };
            /**
     * Determine whether the button/menu contents should persist in response to a specific event
     * @returns {Boolean}
     */
            this.shouldPersist = function () {
                return this.permanent || this.persist;
            };
            /**
     * Button status (highlighted / disabled/ etc)
     * @protected
     * @member {String}
     */
            this.status = '';
            /**
     * Change button state
     * @param {('highlighted'|'disabled'|'')} status
     */
            this.setStatus = function (status) {
                if (typeof status != 'undefined' && [
                        '',
                        'highlighted',
                        'disabled'
                    ].indexOf(status) !== -1) {
                    this.status = status;
                }
                return this.update();
            };
            /**
     * Toggle whether the button is highlighted
     * @param {boolean} bool If provided, explicitly set highlighted state
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.highlight = function (bool) {
                if (typeof bool == 'undefined') {
                    bool = true;
                } else {
                    bool = Boolean(bool);
                }
                if (bool) {
                    return this.setStatus('highlighted');
                } else if (this.status === 'highlighted') {
                    return this.setStatus('');
                }
                return this;
            };
            /**
     * Toggle whether the button is disabled
     * @param {boolean} bool If provided, explicitly set disabled state
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.disable = function (bool) {
                if (typeof bool == 'undefined') {
                    bool = true;
                } else {
                    bool = Boolean(bool);
                }
                if (bool) {
                    return this.setStatus('disabled');
                } else if (this.status === 'disabled') {
                    return this.setStatus('');
                }
                return this;
            };
            // Mouse events
            /** @member {function} */
            this.onmouseover = function () {
            };
            this.setOnMouseover = function (onmouseover) {
                if (typeof onmouseover == 'function') {
                    this.onmouseover = onmouseover;
                } else {
                    this.onmouseover = function () {
                    };
                }
                return this;
            };
            /** @member {function} */
            this.onmouseout = function () {
            };
            this.setOnMouseout = function (onmouseout) {
                if (typeof onmouseout == 'function') {
                    this.onmouseout = onmouseout;
                } else {
                    this.onmouseout = function () {
                    };
                }
                return this;
            };
            /** @member {function} */
            this.onclick = function () {
            };
            this.setOnclick = function (onclick) {
                if (typeof onclick == 'function') {
                    this.onclick = onclick;
                } else {
                    this.onclick = function () {
                    };
                }
                return this;
            };
            // Primary behavior functions
            /**
     * Show the button, including creating DOM elements if necessary for first render
     */
            this.show = function () {
                if (!this.parent) {
                    return;
                }
                if (!this.selector) {
                    this.selector = this.parent.selector.append(this.tag).attr('class', this.getClass());
                }
                return this.update();
            };
            /**
     * Hook for any actions or state cleanup to be performed before rerendering
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.preUpdate = function () {
                return this;
            };
            /**
     * Update button state and contents, and fully rerender
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.update = function () {
                if (!this.selector) {
                    return this;
                }
                this.preUpdate();
                this.selector.attr('class', this.getClass()).attr('title', this.title).style(this.style).on('mouseover', this.status === 'disabled' ? null : this.onmouseover).on('mouseout', this.status === 'disabled' ? null : this.onmouseout).on('click', this.status === 'disabled' ? null : this.onclick).html(this.html);
                this.menu.update();
                this.postUpdate();
                return this;
            };
            /**
     * Hook for any behavior to be added/changed after the button has been re-rendered
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.postUpdate = function () {
                return this;
            };
            /**
     * Hide the button by removing it from the DOM (may be overridden by current persistence setting)
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
            this.hide = function () {
                if (this.selector && !this.shouldPersist()) {
                    this.selector.remove();
                    this.selector = null;
                }
                return this;
            };
            /**
     * Button Menu Object
     * The menu is an HTML overlay that can appear below a button. It can contain arbitrary HTML and
     *   has logic to be automatically positioned and sized to behave more or less like a dropdown menu.
     * @member {Object}
     */
            this.menu = {
                outer_selector: null,
                inner_selector: null,
                scroll_position: 0,
                hidden: true,
                /**
         * Show the button menu, including setting up any DOM elements needed for first rendering
         */
                show: function () {
                    if (!this.menu.outer_selector) {
                        this.menu.outer_selector = d3.select(this.parent_plot.svg.node().parentNode).append('div').attr('class', 'lz-dashboard-menu lz-dashboard-menu-' + this.color).attr('id', this.parent_svg.getBaseId() + '.dashboard.menu');
                        this.menu.inner_selector = this.menu.outer_selector.append('div').attr('class', 'lz-dashboard-menu-content');
                        this.menu.inner_selector.on('scroll', function () {
                            this.menu.scroll_position = this.menu.inner_selector.node().scrollTop;
                        }.bind(this));
                    }
                    this.menu.outer_selector.style({ visibility: 'visible' });
                    this.menu.hidden = false;
                    return this.menu.update();
                }.bind(this),
                /**
         * Update the rendering of the menu
         */
                update: function () {
                    if (!this.menu.outer_selector) {
                        return this.menu;
                    }
                    this.menu.populate();
                    // This function is stubbed for all buttons by default and custom implemented in component definition
                    if (this.menu.inner_selector) {
                        this.menu.inner_selector.node().scrollTop = this.menu.scroll_position;
                    }
                    return this.menu.position();
                }.bind(this),
                position: function () {
                    if (!this.menu.outer_selector) {
                        return this.menu;
                    }
                    // Unset any explicitly defined outer selector height so that menus dynamically shrink if content is removed
                    this.menu.outer_selector.style({ height: null });
                    var padding = 3;
                    var scrollbar_padding = 20;
                    var menu_height_padding = 14;
                    // 14: 2x 6px padding, 2x 1px border
                    var page_origin = this.parent_svg.getPageOrigin();
                    var page_scroll_top = document.documentElement.scrollTop || document.body.scrollTop;
                    var container_offset = this.parent_plot.getContainerOffset();
                    var dashboard_client_rect = this.parent_dashboard.selector.node().getBoundingClientRect();
                    var button_client_rect = this.selector.node().getBoundingClientRect();
                    var menu_client_rect = this.menu.outer_selector.node().getBoundingClientRect();
                    var total_content_height = this.menu.inner_selector.node().scrollHeight;
                    var top = 0;
                    var left = 0;
                    if (this.parent_dashboard.type === 'panel') {
                        top = page_origin.y + dashboard_client_rect.height + 2 * padding;
                        left = Math.max(page_origin.x + this.parent_svg.layout.width - menu_client_rect.width - padding, page_origin.x + padding);
                    } else {
                        top = button_client_rect.bottom + page_scroll_top + padding - container_offset.top;
                        left = Math.max(button_client_rect.left + button_client_rect.width - menu_client_rect.width - container_offset.left, page_origin.x + padding);
                    }
                    var base_max_width = Math.max(this.parent_svg.layout.width - 2 * padding - scrollbar_padding, scrollbar_padding);
                    var container_max_width = base_max_width;
                    var content_max_width = base_max_width - 4 * padding;
                    var base_max_height = Math.max(this.parent_svg.layout.height - 10 * padding - menu_height_padding, menu_height_padding);
                    var height = Math.min(total_content_height, base_max_height);
                    var max_height = base_max_height;
                    this.menu.outer_selector.style({
                        'top': top.toString() + 'px',
                        'left': left.toString() + 'px',
                        'max-width': container_max_width.toString() + 'px',
                        'max-height': max_height.toString() + 'px',
                        'height': height.toString() + 'px'
                    });
                    this.menu.inner_selector.style({ 'max-width': content_max_width.toString() + 'px' });
                    this.menu.inner_selector.node().scrollTop = this.menu.scroll_position;
                    return this.menu;
                }.bind(this),
                hide: function () {
                    if (!this.menu.outer_selector) {
                        return this.menu;
                    }
                    this.menu.outer_selector.style({ visibility: 'hidden' });
                    this.menu.hidden = true;
                    return this.menu;
                }.bind(this),
                destroy: function () {
                    if (!this.menu.outer_selector) {
                        return this.menu;
                    }
                    this.menu.inner_selector.remove();
                    this.menu.outer_selector.remove();
                    this.menu.inner_selector = null;
                    this.menu.outer_selector = null;
                    return this.menu;
                }.bind(this),
                /**
         * Internal method definition
         * By convention populate() does nothing and should be reimplemented with each dashboard button definition
         *   Reimplement by way of Dashboard.Component.Button.menu.setPopulate to define the populate method and hook
         *   up standard menu click-toggle behavior prototype.
         * @protected
         */
                populate: function () {
                }.bind(this),
                /**
         * Define how the menu is populated with items, and set up click and display properties as appropriate
         * @public
         */
                setPopulate: function (menu_populate_function) {
                    if (typeof menu_populate_function == 'function') {
                        this.menu.populate = menu_populate_function;
                        this.setOnclick(function () {
                            if (this.menu.hidden) {
                                this.menu.show();
                                this.highlight().update();
                                this.persist = true;
                            } else {
                                this.menu.hide();
                                this.highlight(false).update();
                                if (!this.permanent) {
                                    this.persist = false;
                                }
                            }
                        }.bind(this));
                    } else {
                        this.setOnclick();
                    }
                    return this;
                }.bind(this)
            };
        };
        /**
 * Renders arbitrary text with title formatting
 * @class LocusZoom.Dashboard.Components.title
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {string} layout.title Text to render
 */
        LocusZoom.Dashboard.Components.add('title', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.show = function () {
                this.div_selector = this.parent.selector.append('div').attr('class', 'lz-dashboard-title lz-dashboard-' + this.layout.position);
                this.title_selector = this.div_selector.append('h3');
                return this.update();
            };
            this.update = function () {
                var title = layout.title.toString();
                if (this.layout.subtitle) {
                    title += ' <small>' + this.layout.subtitle + '</small>';
                }
                this.title_selector.html(title);
                return this;
            };
        });
        /**
 * Renders text to display the current dimensions of the plot. Automatically updated as plot dimensions change
 * @class LocusZoom.Dashboard.Components.dimensions
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('dimensions', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                var display_width = this.parent_plot.layout.width.toString().indexOf('.') === -1 ? this.parent_plot.layout.width : this.parent_plot.layout.width.toFixed(2);
                var display_height = this.parent_plot.layout.height.toString().indexOf('.') === -1 ? this.parent_plot.layout.height : this.parent_plot.layout.height.toFixed(2);
                this.selector.html(display_width + 'px \xD7 ' + display_height + 'px');
                if (layout.class) {
                    this.selector.attr('class', layout.class);
                }
                if (layout.style) {
                    this.selector.style(layout.style);
                }
                return this;
            };
        });
        /**
 * Display the current scale of the genome region displayed in the plot, as defined by the difference between
 *  `state.end` and `state.start`.
 * @class LocusZoom.Dashboard.Components.region_scale
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('region_scale', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (!isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end) && this.parent_plot.state.start !== null && this.parent_plot.state.end !== null) {
                    this.selector.style('display', null);
                    this.selector.html(LocusZoom.positionIntToString(this.parent_plot.state.end - this.parent_plot.state.start, null, true));
                } else {
                    this.selector.style('display', 'none');
                }
                if (layout.class) {
                    this.selector.attr('class', layout.class);
                }
                if (layout.style) {
                    this.selector.style(layout.style);
                }
                return this;
            };
        });
        /**
 * Button to export current plot to an SVG image
 * @class LocusZoom.Dashboard.Components.download
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('download', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml('Download Image').setTitle('Download image of the current plot as locuszoom.svg').setOnMouseover(function () {
                    this.button.selector.classed('lz-dashboard-button-gray-disabled', true).html('Preparing Image');
                    this.generateBase64SVG().then(function (base64_string) {
                        this.button.selector.attr('href', 'data:image/svg+xml;base64,\n' + base64_string).classed('lz-dashboard-button-gray-disabled', false).classed('lz-dashboard-button-gray-highlighted', true).html('Download Image');
                    }.bind(this));
                }.bind(this)).setOnMouseout(function () {
                    this.button.selector.classed('lz-dashboard-button-gray-highlighted', false);
                }.bind(this));
                this.button.show();
                this.button.selector.attr('href-lang', 'image/svg+xml').attr('download', 'locuszoom.svg');
                return this;
            };
            this.css_string = '';
            for (var stylesheet in Object.keys(document.styleSheets)) {
                if (document.styleSheets[stylesheet].href !== null && document.styleSheets[stylesheet].href.indexOf('locuszoom.css') !== -1) {
                    // TODO: "Download image" button will render the image incorrectly if the stylesheet has been renamed or concatenated
                    LocusZoom.createCORSPromise('GET', document.styleSheets[stylesheet].href).then(function (response) {
                        this.css_string = response.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ');
                        if (this.css_string.indexOf('/* ! LocusZoom HTML Styles */')) {
                            this.css_string = this.css_string.substring(0, this.css_string.indexOf('/* ! LocusZoom HTML Styles */'));
                        }
                    }.bind(this));
                    break;
                }
            }
            this.generateBase64SVG = function () {
                return Q.fcall(function () {
                    // Insert a hidden div, clone the node into that so we can modify it with d3
                    var container = this.parent.selector.append('div').style('display', 'none').html(this.parent_plot.svg.node().outerHTML);
                    // Remove unnecessary elements
                    container.selectAll('g.lz-curtain').remove();
                    container.selectAll('g.lz-mouse_guide').remove();
                    // Convert units on axis tick dy attributes from ems to pixels
                    container.selectAll('g.tick text').each(function () {
                        var dy = +d3.select(this).attr('dy').substring(-2).slice(0, -2) * 10;
                        d3.select(this).attr('dy', dy);
                    });
                    // Pull the svg into a string and add the contents of the locuszoom stylesheet
                    // Don't add this with d3 because it will escape the CDATA declaration incorrectly
                    var initial_html = d3.select(container.select('svg').node().parentNode).html();
                    var style_def = '<style type="text/css"><![CDATA[ ' + this.css_string + ' ]]></style>';
                    var insert_at = initial_html.indexOf('>') + 1;
                    initial_html = initial_html.slice(0, insert_at) + style_def + initial_html.slice(insert_at);
                    // Delete the container node
                    container.remove();
                    // Base64-encode the string and return it
                    return btoa(encodeURIComponent(initial_html).replace(/%([0-9A-F]{2})/g, function (match, p1) {
                        return String.fromCharCode('0x' + p1);
                    }));
                }.bind(this));
            };
        });
        /**
 * Button to remove panel from plot.
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.remove_panel
 * @augments LocusZoom.Dashboard.Component
 * @param {Boolean} [layout.suppress_confirm=false] If true, removes the panel without prompting user for confirmation
 */
        LocusZoom.Dashboard.Components.add('remove_panel', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml('\xD7').setTitle('Remove panel').setOnclick(function () {
                    if (!layout.suppress_confirm && !confirm('Are you sure you want to remove this panel? This cannot be undone!')) {
                        return false;
                    }
                    var panel = this.parent_panel;
                    panel.dashboard.hide(true);
                    d3.select(panel.parent.svg.node().parentNode).on('mouseover.' + panel.getBaseId() + '.dashboard', null);
                    d3.select(panel.parent.svg.node().parentNode).on('mouseout.' + panel.getBaseId() + '.dashboard', null);
                    return panel.parent.removePanel(panel.id);
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Button to move panel up relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.move_panel_up
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('move_panel_up', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    var is_at_top = this.parent_panel.layout.y_index === 0;
                    this.button.disable(is_at_top);
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml('\u25B4').setTitle('Move panel up').setOnclick(function () {
                    this.parent_panel.moveUp();
                    this.update();
                }.bind(this));
                this.button.show();
                return this.update();
            };
        });
        /**
 * Button to move panel down relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.move_panel_down
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('move_panel_down', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    var is_at_bottom = this.parent_panel.layout.y_index === this.parent_plot.panel_ids_by_y_index.length - 1;
                    this.button.disable(is_at_bottom);
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml('\u25BE').setTitle('Move panel down').setOnclick(function () {
                    this.parent_panel.moveDown();
                    this.update();
                }.bind(this));
                this.button.show();
                return this.update();
            };
        });
        /**
 * Button to shift plot region forwards or back by a `step` increment provided in the layout
 * @class LocusZoom.Dashboard.Components.shift_region
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {number} [layout.step=50000] The stepsize to change the region by
 * @param {string} [layout.button_html]
 * @param {string} [layout.button_title]
 */
        LocusZoom.Dashboard.Components.add('shift_region', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
                this.update = function () {
                };
                console.warn('Unable to add shift_region dashboard component: plot state does not have region bounds');
                return;
            }
            if (isNaN(layout.step) || layout.step === 0) {
                layout.step = 50000;
            }
            if (typeof layout.button_html !== 'string') {
                layout.button_html = layout.step > 0 ? '>' : '<';
            }
            if (typeof layout.button_title !== 'string') {
                layout.button_title = 'Shift region by ' + (layout.step > 0 ? '+' : '-') + LocusZoom.positionIntToString(Math.abs(layout.step), null, true);
            }
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title).setOnclick(function () {
                    this.parent_plot.applyState({
                        start: Math.max(this.parent_plot.state.start + layout.step, 1),
                        end: this.parent_plot.state.end + layout.step
                    });
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Zoom in or out on the plot, centered on the middle of the plot region, by the specified amount
 * @class LocusZoom.Dashboard.Components.zoom_region
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {number} [layout.step=0.2] The amount to zoom in by (where 1 indicates 100%)
 */
        LocusZoom.Dashboard.Components.add('zoom_region', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
                this.update = function () {
                };
                console.warn('Unable to add zoom_region dashboard component: plot state does not have region bounds');
                return;
            }
            if (isNaN(layout.step) || layout.step === 0) {
                layout.step = 0.2;
            }
            if (typeof layout.button_html != 'string') {
                layout.button_html = layout.step > 0 ? 'z\u2013' : 'z+';
            }
            if (typeof layout.button_title != 'string') {
                layout.button_title = 'Zoom region ' + (layout.step > 0 ? 'out' : 'in') + ' by ' + (Math.abs(layout.step) * 100).toFixed(1) + '%';
            }
            this.update = function () {
                if (this.button) {
                    var can_zoom = true;
                    var current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
                    if (layout.step > 0 && !isNaN(this.parent_plot.layout.max_region_scale) && current_region_scale >= this.parent_plot.layout.max_region_scale) {
                        can_zoom = false;
                    }
                    if (layout.step < 0 && !isNaN(this.parent_plot.layout.min_region_scale) && current_region_scale <= this.parent_plot.layout.min_region_scale) {
                        can_zoom = false;
                    }
                    this.button.disable(!can_zoom);
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title).setOnclick(function () {
                    var current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
                    var zoom_factor = 1 + layout.step;
                    var new_region_scale = current_region_scale * zoom_factor;
                    if (!isNaN(this.parent_plot.layout.max_region_scale)) {
                        new_region_scale = Math.min(new_region_scale, this.parent_plot.layout.max_region_scale);
                    }
                    if (!isNaN(this.parent_plot.layout.min_region_scale)) {
                        new_region_scale = Math.max(new_region_scale, this.parent_plot.layout.min_region_scale);
                    }
                    var delta = Math.floor((new_region_scale - current_region_scale) / 2);
                    this.parent_plot.applyState({
                        start: Math.max(this.parent_plot.state.start - delta, 1),
                        end: this.parent_plot.state.end + delta
                    });
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Renders button with arbitrary text that, when clicked, shows a dropdown containing arbitrary HTML
 *  NOTE: Trusts content exactly as given. XSS prevention is the responsibility of the implementer.
 * @class LocusZoom.Dashboard.Components.menu
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {string} layout.button_html The HTML to render inside the button
 * @param {string} layout.button_title Text to display as a tooltip when hovering over the button
 * @param {string} layout.menu_html The HTML content of the dropdown menu
 */
        LocusZoom.Dashboard.Components.add('menu', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title);
                this.button.menu.setPopulate(function () {
                    this.button.menu.inner_selector.html(layout.menu_html);
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Special button/menu to allow model building by tracking individual covariants. Will track a list of covariate
 *   objects and store them in the special `model.covariates` field of plot `state`.
 * @class LocusZoom.Dashboard.Components.covariates_model
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {string} layout.button_html The HTML to render inside the button
 * @param {string} layout.button_title Text to display as a tooltip when hovering over the button
 */
        LocusZoom.Dashboard.Components.add('covariates_model', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.initialize = function () {
                // Initialize state.model.covariates
                this.parent_plot.state.model = this.parent_plot.state.model || {};
                this.parent_plot.state.model.covariates = this.parent_plot.state.model.covariates || [];
                // Create an object at the plot level for easy access to interface methods in custom client-side JS
                /**
         * When a covariates model dashboard element is present, create (one) object at the plot level that exposes
         *   component data and state for custom interactions with other plot elements.
         * @class LocusZoom.Plot.CovariatesModel
         */
                this.parent_plot.CovariatesModel = {
                    /** @member {LocusZoom.Dashboard.Component.Button} */
                    button: this,
                    /**
             * Add an element to the model and show a representation of it in the dashboard component menu. If the
             *   element is already part of the model, do nothing (to avoid adding duplicates).
             * When plot state is changed, this will automatically trigger requests for new data accordingly.
             * @param {string|object} element_reference Can be any value that can be put through JSON.stringify()
             *   to create a serialized representation of itself.
             */
                    add: function (element_reference) {
                        var element = JSON.parse(JSON.stringify(element_reference));
                        if (typeof element_reference == 'object' && typeof element.html != 'string') {
                            element.html = typeof element_reference.toHTML == 'function' ? element_reference.toHTML() : element_reference.toString();
                        }
                        // Check if the element is already in the model covariates array and return if it is.
                        for (var i = 0; i < this.state.model.covariates.length; i++) {
                            if (JSON.stringify(this.state.model.covariates[i]) === JSON.stringify(element)) {
                                return this;
                            }
                        }
                        this.state.model.covariates.push(element);
                        this.applyState();
                        this.CovariatesModel.updateComponent();
                        return this;
                    }.bind(this.parent_plot),
                    /**
             * Remove an element from `state.model.covariates` (and from the dashboard component menu's
             *  representation of the state model). When plot state is changed, this will automatically trigger
             *  requests for new data accordingly.
             * @param {number} idx Array index of the element, in the `state.model.covariates array`.
             */
                    removeByIdx: function (idx) {
                        if (typeof this.state.model.covariates[idx] == 'undefined') {
                            throw 'Unable to remove model covariate, invalid index: ' + idx.toString();
                        }
                        this.state.model.covariates.splice(idx, 1);
                        this.applyState();
                        this.CovariatesModel.updateComponent();
                        return this;
                    }.bind(this.parent_plot),
                    /**
             * Empty the `state.model.covariates` array (and dashboard component menu representation thereof) of all
             *  elements. When plot state is changed, this will automatically trigger requests for new data accordingly
             */
                    removeAll: function () {
                        this.state.model.covariates = [];
                        this.applyState();
                        this.CovariatesModel.updateComponent();
                        return this;
                    }.bind(this.parent_plot),
                    /**
             * Manually trigger the update methods on the dashboard component's button and menu elements to force
             *   display of most up-to-date content. Can be used to force the dashboard to reflect changes made, eg if
             *   modifying `state.model.covariates` directly instead of via `plot.CovariatesModel`
             */
                    updateComponent: function () {
                        this.button.update();
                        this.button.menu.update();
                    }.bind(this)
                };
            }.bind(this);
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title).setOnclick(function () {
                    this.button.menu.populate();
                }.bind(this));
                this.button.menu.setPopulate(function () {
                    var selector = this.button.menu.inner_selector;
                    selector.html('');
                    // General model HTML representation
                    if (typeof this.parent_plot.state.model.html != 'undefined') {
                        selector.append('div').html(this.parent_plot.state.model.html);
                    }
                    // Model covariates table
                    if (!this.parent_plot.state.model.covariates.length) {
                        selector.append('i').html('no covariates in model');
                    } else {
                        selector.append('h5').html('Model Covariates (' + this.parent_plot.state.model.covariates.length + ')');
                        var table = selector.append('table');
                        this.parent_plot.state.model.covariates.forEach(function (covariate, idx) {
                            var html = typeof covariate == 'object' && typeof covariate.html == 'string' ? covariate.html : covariate.toString();
                            var row = table.append('tr');
                            row.append('td').append('button').attr('class', 'lz-dashboard-button lz-dashboard-button-' + this.layout.color).style({ 'margin-left': '0em' }).on('click', function () {
                                this.parent_plot.CovariatesModel.removeByIdx(idx);
                            }.bind(this)).html('\xD7');
                            row.append('td').html(html);
                        }.bind(this));
                        selector.append('button').attr('class', 'lz-dashboard-button lz-dashboard-button-' + this.layout.color).style({ 'margin-left': '4px' }).html('\xD7 Remove All Covariates').on('click', function () {
                            this.parent_plot.CovariatesModel.removeAll();
                        }.bind(this));
                    }
                }.bind(this));
                this.button.preUpdate = function () {
                    var html = 'Model';
                    if (this.parent_plot.state.model.covariates.length) {
                        var cov = this.parent_plot.state.model.covariates.length > 1 ? 'covariates' : 'covariate';
                        html += ' (' + this.parent_plot.state.model.covariates.length + ' ' + cov + ')';
                    }
                    this.button.setHtml(html).disable(false);
                }.bind(this);
                this.button.show();
                return this;
            };
        });
        /**
 * Button to toggle split tracks
 * @class LocusZoom.Dashboard.Components.toggle_split_tracks
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('toggle_split_tracks', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            if (!layout.data_layer_id) {
                layout.data_layer_id = 'intervals';
            }
            if (!this.parent_panel.data_layers[layout.data_layer_id]) {
                throw 'Dashboard toggle split tracks component missing valid data layer ID';
            }
            this.update = function () {
                var data_layer = this.parent_panel.data_layers[layout.data_layer_id];
                var html = data_layer.layout.split_tracks ? 'Merge Tracks' : 'Split Tracks';
                if (this.button) {
                    this.button.setHtml(html);
                    this.button.show();
                    this.parent.position();
                    return this;
                } else {
                    this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(html).setTitle('Toggle whether tracks are split apart or merged together').setOnclick(function () {
                        data_layer.toggleSplitTracks();
                        if (this.scale_timeout) {
                            clearTimeout(this.scale_timeout);
                        }
                        var timeout = data_layer.layout.transition ? +data_layer.layout.transition.duration || 0 : 0;
                        this.scale_timeout = setTimeout(function () {
                            this.parent_panel.scaleHeightToData();
                            this.parent_plot.positionPanels();
                        }.bind(this), timeout);
                        this.update();
                    }.bind(this));
                    return this.update();
                }
            };
        });
        /**
 * Button to resize panel height to fit available data (eg when showing a list of tracks)
 * @class LocusZoom.Dashboard.Components.resize_to_data
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('resize_to_data', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml('Resize to Data').setTitle('Automatically resize this panel to fit the data its currently showing').setOnclick(function () {
                    this.parent_panel.scaleHeightToData();
                    this.update();
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Button to toggle legend
 * @class LocusZoom.Dashboard.Components.toggle_legend
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('toggle_legend', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                var html = this.parent_panel.legend.layout.hidden ? 'Show Legend' : 'Hide Legend';
                if (this.button) {
                    this.button.setHtml(html).show();
                    this.parent.position();
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setTitle('Show or hide the legend for this panel').setOnclick(function () {
                    this.parent_panel.legend.layout.hidden = !this.parent_panel.legend.layout.hidden;
                    this.parent_panel.legend.render();
                    this.update();
                }.bind(this));
                return this.update();
            };
        });
        /**
 * Menu for manipulating multiple data layers in a single panel: show/hide, change order, etc.
 * @class LocusZoom.Dashboard.Components.data_layers
 * @augments LocusZoom.Dashboard.Component
 */
        LocusZoom.Dashboard.Components.add('data_layers', function (layout) {
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function () {
                if (typeof layout.button_html != 'string') {
                    layout.button_html = 'Data Layers';
                }
                if (typeof layout.button_title != 'string') {
                    layout.button_title = 'Manipulate Data Layers (sort, dim, show/hide, etc.)';
                }
                if (this.button) {
                    return this;
                }
                this.button = new LocusZoom.Dashboard.Component.Button(this).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title).setOnclick(function () {
                    this.button.menu.populate();
                }.bind(this));
                this.button.menu.setPopulate(function () {
                    this.button.menu.inner_selector.html('');
                    var table = this.button.menu.inner_selector.append('table');
                    this.parent_panel.data_layer_ids_by_z_index.slice().reverse().forEach(function (id, idx) {
                        var data_layer = this.parent_panel.data_layers[id];
                        var name = typeof data_layer.layout.name != 'string' ? data_layer.id : data_layer.layout.name;
                        var row = table.append('tr');
                        // Layer name
                        row.append('td').html(name);
                        // Status toggle buttons
                        layout.statuses.forEach(function (status_adj) {
                            var status_idx = LocusZoom.DataLayer.Statuses.adjectives.indexOf(status_adj);
                            var status_verb = LocusZoom.DataLayer.Statuses.verbs[status_idx];
                            var html, onclick, highlight;
                            if (data_layer.global_statuses[status_adj]) {
                                html = LocusZoom.DataLayer.Statuses.menu_antiverbs[status_idx];
                                onclick = 'un' + status_verb + 'AllElements';
                                highlight = '-highlighted';
                            } else {
                                html = LocusZoom.DataLayer.Statuses.verbs[status_idx];
                                onclick = status_verb + 'AllElements';
                                highlight = '';
                            }
                            row.append('td').append('a').attr('class', 'lz-dashboard-button lz-dashboard-button-' + this.layout.color + highlight).style({ 'margin-left': '0em' }).on('click', function () {
                                data_layer[onclick]();
                                this.button.menu.populate();
                            }.bind(this)).html(html);
                        }.bind(this));
                        // Sort layer buttons
                        var at_top = idx === 0;
                        var at_bottom = idx === this.parent_panel.data_layer_ids_by_z_index.length - 1;
                        var td = row.append('td');
                        td.append('a').attr('class', 'lz-dashboard-button lz-dashboard-button-group-start lz-dashboard-button-' + this.layout.color + (at_bottom ? '-disabled' : '')).style({ 'margin-left': '0em' }).on('click', function () {
                            data_layer.moveDown();
                            this.button.menu.populate();
                        }.bind(this)).html('\u25BE').attr('title', 'Move layer down (further back)');
                        td.append('a').attr('class', 'lz-dashboard-button lz-dashboard-button-group-middle lz-dashboard-button-' + this.layout.color + (at_top ? '-disabled' : '')).style({ 'margin-left': '0em' }).on('click', function () {
                            data_layer.moveUp();
                            this.button.menu.populate();
                        }.bind(this)).html('\u25B4').attr('title', 'Move layer up (further front)');
                        td.append('a').attr('class', 'lz-dashboard-button lz-dashboard-button-group-end lz-dashboard-button-red').style({ 'margin-left': '0em' }).on('click', function () {
                            if (confirm('Are you sure you want to remove the ' + name + ' layer? This cannot be undone!')) {
                                data_layer.parent.removeDataLayer(id);
                            }
                            return this.button.menu.populate();
                        }.bind(this)).html('\xD7').attr('title', 'Remove layer');
                    }.bind(this));
                    return this;
                }.bind(this));
                this.button.show();
                return this;
            };
        });
        /**
 * Dropdown menu allowing the user to choose between different display options for a single specific data layer
 *  within a panel.
 *
 * This allows controlling how points on a datalayer can be displayed- any display options supported via the layout for the target datalayer. This includes point
 *  size/shape, coloring, etc.
 *
 * This button intentionally limits display options it can control to those available on common plot types.
 *   Although the list of options it sets can be overridden (to control very special custom plot types), this
 *   capability should be used sparingly if at all.
 *
 * @class LocusZoom.Dashboard.Components.display_options
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {String} [layout.button_html="Display options..."] Text to display on the toolbar button
 * @param {String} [layout.button_title="Control how plot items are displayed"] Hover text for the toolbar button
 * @param {string} layout.layer_name Specify the datalayer that this button should affect
 * @param {string} [layout.default_config_display_name] Store the default configuration for this datalayer
 *  configuration, and show a button to revert to the "default" (listing the human-readable display name provided)
 * @param {Array} [layout.fields_whitelist='see code'] The list of presentation fields that this button can control.
 *  This can be overridden if this button needs to be used on a custom layer type with special options.
 * @typedef {{display_name: string, display: Object}} DisplayOptionsButtonConfigField
 * @param {DisplayOptionsButtonConfigField[]} layout.options Specify a label and set of layout directives associated
 *  with this `display` option. Display field should include all changes to datalayer presentation options.
 */
        LocusZoom.Dashboard.Components.add('display_options', function (layout) {
            if (typeof layout.button_html != 'string') {
                layout.button_html = 'Display options...';
            }
            if (typeof layout.button_title != 'string') {
                layout.button_title = 'Control how plot items are displayed';
            }
            // Call parent constructor
            LocusZoom.Dashboard.Component.apply(this, arguments);
            // List of layout fields that this button is allowed to control. This ensures that we don't override any other
            //  information (like plot height etc) while changing point rendering
            var allowed_fields = layout.fields_whitelist || [
                'color',
                'fill_opacity',
                'label',
                'legend',
                'point_shape',
                'point_size',
                'tooltip',
                'tooltip_positioning'
            ];
            var dataLayer = this.parent_panel.data_layers[layout.layer_name];
            if (!dataLayer) {
                throw 'Display options could not locate the specified layer_name: \'' + layout.layer_name + '\'';
            }
            var dataLayerLayout = dataLayer.layout;
            // Store default configuration for the layer as a clean deep copy, so we may revert later
            var defaultConfig = {};
            allowed_fields.forEach(function (name) {
                var configSlot = dataLayerLayout[name];
                if (configSlot !== undefined) {
                    defaultConfig[name] = JSON.parse(JSON.stringify(configSlot));
                }
            });
            /**
     * Which item in the menu is currently selected. (track for rerendering menu)
     * @member {String}
     * @private
     */
            this._selected_item = 'default';
            // Define the button + menu that provides the real functionality for this dashboard component
            var self = this;
            this.button = new LocusZoom.Dashboard.Component.Button(self).setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title).setOnclick(function () {
                self.button.menu.populate();
            });
            this.button.menu.setPopulate(function () {
                // Multiple copies of this button might be used on a single LZ page; append unique IDs where needed
                var uniqueID = Math.floor(Math.random() * 10000).toString();
                self.button.menu.inner_selector.html('');
                var table = self.button.menu.inner_selector.append('table');
                var menuLayout = self.layout;
                var renderRow = function (display_name, display_options, row_id) {
                    // Helper method
                    var row = table.append('tr');
                    var radioId = '' + uniqueID + row_id;
                    row.append('td').append('input').attr({
                        id: radioId,
                        type: 'radio',
                        name: 'display-option-' + uniqueID,
                        value: row_id
                    }).style('margin', 0)    // Override css libraries (eg skeleton) that style form inputs
.property('checked', row_id === self._selected_item).on('click', function () {
                        Object.keys(display_options).forEach(function (field_name) {
                            dataLayer.layout[field_name] = display_options[field_name];
                        });
                        self._selected_item = row_id;
                        self.parent_panel.render();
                        var legend = self.parent_panel.legend;
                        if (legend && display_options.legend) {
                            // Update the legend only if necessary
                            legend.render();
                        }
                    });
                    row.append('td').append('label').style('font-weight', 'normal').attr('for', radioId).text(display_name);
                };
                // Render the "display options" menu: default and special custom options
                var defaultName = menuLayout.default_config_display_name || 'Default style';
                renderRow(defaultName, defaultConfig, 'default');
                menuLayout.options.forEach(function (item, index) {
                    renderRow(item.display_name, item.display, index);
                });
                return self;
            });
            this.update = function () {
                this.button.show();
                return this;
            };
        });
        /* global LocusZoom */
        'use strict';
        /**
 * An SVG object used to display contextual information about a panel.
 * Panel layouts determine basic features of a legend - its position in the panel, orientation, title, etc.
 * Layouts of child data layers of the panel determine the actual content of the legend.
 *
 * @class
 * @param {LocusZoom.Panel} parent
*/
        LocusZoom.Legend = function (parent) {
            if (!(parent instanceof LocusZoom.Panel)) {
                throw 'Unable to create legend, parent must be a locuszoom panel';
            }
            /** @member {LocusZoom.Panel} */
            this.parent = parent;
            /** @member {String} */
            this.id = this.parent.getBaseId() + '.legend';
            this.parent.layout.legend = LocusZoom.Layouts.merge(this.parent.layout.legend || {}, LocusZoom.Legend.DefaultLayout);
            /** @member {Object} */
            this.layout = this.parent.layout.legend;
            /** @member {d3.selection} */
            this.selector = null;
            /** @member {d3.selection} */
            this.background_rect = null;
            /** @member {d3.selection[]} */
            this.elements = [];
            /**
     * SVG selector for the group containing all elements in the legend
     * @protected
     * @member {d3.selection|null}
     */
            this.elements_group = null;
            /**
     * TODO: Not sure if this property is used; the external-facing methods are setting `layout.hidden` instead. Tentatively mark deprecated.
     * @deprecated
     * @protected
     * @member {Boolean}
     */
            this.hidden = false;
            // TODO Revisit constructor return value; see https://stackoverflow.com/a/3350364/1422268
            return this.render();
        };
        /**
 * The default layout used by legends (used internally)
 * @protected
 * @member {Object}
 */
        LocusZoom.Legend.DefaultLayout = {
            orientation: 'vertical',
            origin: {
                x: 0,
                y: 0
            },
            width: 10,
            height: 10,
            padding: 5,
            label_size: 12,
            hidden: false
        };
        /**
 * Render the legend in the parent panel
 */
        LocusZoom.Legend.prototype.render = function () {
            // Get a legend group selector if not yet defined
            if (!this.selector) {
                this.selector = this.parent.svg.group.append('g').attr('id', this.parent.getBaseId() + '.legend').attr('class', 'lz-legend');
            }
            // Get a legend background rect selector if not yet defined
            if (!this.background_rect) {
                this.background_rect = this.selector.append('rect').attr('width', 100).attr('height', 100).attr('class', 'lz-legend-background');
            }
            // Get a legend elements group selector if not yet defined
            if (!this.elements_group) {
                this.elements_group = this.selector.append('g');
            }
            // Remove all elements from the document and re-render from scratch
            this.elements.forEach(function (element) {
                element.remove();
            });
            this.elements = [];
            // Gather all elements from data layers in order (top to bottom) and render them
            var padding = +this.layout.padding || 1;
            var x = padding;
            var y = padding;
            var line_height = 0;
            this.parent.data_layer_ids_by_z_index.slice().reverse().forEach(function (id) {
                if (Array.isArray(this.parent.data_layers[id].layout.legend)) {
                    this.parent.data_layers[id].layout.legend.forEach(function (element) {
                        var selector = this.elements_group.append('g').attr('transform', 'translate(' + x + ',' + y + ')');
                        var label_size = +element.label_size || +this.layout.label_size || 12;
                        var label_x = 0;
                        var label_y = label_size / 2 + padding / 2;
                        line_height = Math.max(line_height, label_size + padding);
                        // Draw the legend element symbol (line, rect, shape, etc)
                        if (element.shape === 'line') {
                            // Line symbol
                            var length = +element.length || 16;
                            var path_y = label_size / 4 + padding / 2;
                            selector.append('path').attr('class', element.class || '').attr('d', 'M0,' + path_y + 'L' + length + ',' + path_y).style(element.style || {});
                            label_x = length + padding;
                        } else if (element.shape === 'rect') {
                            // Rect symbol
                            var width = +element.width || 16;
                            var height = +element.height || width;
                            selector.append('rect').attr('class', element.class || '').attr('width', width).attr('height', height).attr('fill', element.color || {}).style(element.style || {});
                            label_x = width + padding;
                            line_height = Math.max(line_height, height + padding);
                        } else if (d3.svg.symbolTypes.indexOf(element.shape) !== -1) {
                            // Shape symbol (circle, diamond, etc.)
                            var size = +element.size || 40;
                            var radius = Math.ceil(Math.sqrt(size / Math.PI));
                            selector.append('path').attr('class', element.class || '').attr('d', d3.svg.symbol().size(size).type(element.shape)).attr('transform', 'translate(' + radius + ',' + (radius + padding / 2) + ')').attr('fill', element.color || {}).style(element.style || {});
                            label_x = 2 * radius + padding;
                            label_y = Math.max(2 * radius + padding / 2, label_y);
                            line_height = Math.max(line_height, 2 * radius + padding);
                        }
                        // Draw the legend element label
                        selector.append('text').attr('text-anchor', 'left').attr('class', 'lz-label').attr('x', label_x).attr('y', label_y).style({ 'font-size': label_size }).text(element.label);
                        // Position the legend element group based on legend layout orientation
                        var bcr = selector.node().getBoundingClientRect();
                        if (this.layout.orientation === 'vertical') {
                            y += bcr.height + padding;
                            line_height = 0;
                        } else {
                            // Ensure this element does not exceed the panel width
                            // (E.g. drop to the next line if it does, but only if it's not the only element on this line)
                            var right_x = this.layout.origin.x + x + bcr.width;
                            if (x > padding && right_x > this.parent.layout.width) {
                                y += line_height;
                                x = padding;
                                selector.attr('transform', 'translate(' + x + ',' + y + ')');
                            }
                            x += bcr.width + 3 * padding;
                        }
                        // Store the element
                        this.elements.push(selector);
                    }.bind(this));
                }
            }.bind(this));
            // Scale the background rect to the elements in the legend
            var bcr = this.elements_group.node().getBoundingClientRect();
            this.layout.width = bcr.width + 2 * this.layout.padding;
            this.layout.height = bcr.height + 2 * this.layout.padding;
            this.background_rect.attr('width', this.layout.width).attr('height', this.layout.height);
            // Set the visibility on the legend from the "hidden" flag
            // TODO: `show()` and `hide()` call a full rerender; might be able to make this more lightweight?
            this.selector.style({ visibility: this.layout.hidden ? 'hidden' : 'visible' });
            // TODO: Annotate return type and make consistent
            return this.position();
        };
        /**
 * Place the legend in position relative to the panel, as specified in the layout configuration
 * @returns {LocusZoom.Legend | null}
 * TODO: should this always be chainable?
 */
        LocusZoom.Legend.prototype.position = function () {
            if (!this.selector) {
                return this;
            }
            var bcr = this.selector.node().getBoundingClientRect();
            if (!isNaN(+this.layout.pad_from_bottom)) {
                this.layout.origin.y = this.parent.layout.height - bcr.height - +this.layout.pad_from_bottom;
            }
            if (!isNaN(+this.layout.pad_from_right)) {
                this.layout.origin.x = this.parent.layout.width - bcr.width - +this.layout.pad_from_right;
            }
            this.selector.attr('transform', 'translate(' + this.layout.origin.x + ',' + this.layout.origin.y + ')');
        };
        /**
 * Hide the legend (triggers a re-render)
 * @public
 */
        LocusZoom.Legend.prototype.hide = function () {
            this.layout.hidden = true;
            this.render();
        };
        /**
 * Show the legend (triggers a re-render)
 * @public
 */
        LocusZoom.Legend.prototype.show = function () {
            this.layout.hidden = false;
            this.render();
        };
        /* global LocusZoom */
        'use strict';
        /**
 * LocusZoom functionality used for data parsing and retrieval
 * @namespace
 * @public
 */
        LocusZoom.Data = LocusZoom.Data || {};
        /**
 * Create and coordinate an ensemble of (namespaced) data source instances
 * @public
 * @class
 */
        LocusZoom.DataSources = function () {
            /** @member {Object.<string, LocusZoom.Data.Source>} */
            this.sources = {};
        };
        /** @deprecated */
        LocusZoom.DataSources.prototype.addSource = function (ns, x) {
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
        LocusZoom.DataSources.prototype.add = function (ns, x) {
            // FIXME: Some existing sites create sources with arbitrary names. This leads to subtle breakage
            //    of namespaced fields in layouts. To avoid breaking existing usages outright, issue a deprecation warning.
            if (ns.match(/[^A-Za-z0-9_]/)) {
                console.warn('Deprecation warning: source name \'' + ns + '\' should contain only alphanumeric characters or underscores. Use of other characters may break layouts, and will be disallowed in the future.');
            }
            return this.set(ns, x);
        };
        /** @protected */
        LocusZoom.DataSources.prototype.set = function (ns, x) {
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
        LocusZoom.DataSources.prototype.getSource = function (ns) {
            console.warn('Warning: .getSource() is deprecated. Use .get() instead');
            return this.get(ns);
        };
        /**
 * Return the datasource associated with a given namespace
 * @public
 * @param {String} ns Namespace
 * @returns {LocusZoom.Data.Source}
 */
        LocusZoom.DataSources.prototype.get = function (ns) {
            return this.sources[ns];
        };
        /** @deprecated */
        LocusZoom.DataSources.prototype.removeSource = function (ns) {
            console.warn('Warning: .removeSource() is deprecated. Use .remove() instead');
            return this.remove(ns);
        };
        /**
 * Remove the datasource associated with a given namespace
 * @public
 * @param {String} ns Namespace
 */
        LocusZoom.DataSources.prototype.remove = function (ns) {
            return this.set(ns, null);
        };
        /**
 * Populate a list of datasources specified as a JSON object
 * @public
 * @param {String|Object} x An object or JSON representation containing {ns: configArray} entries
 * @returns {LocusZoom.DataSources}
 */
        LocusZoom.DataSources.prototype.fromJSON = function (x) {
            if (typeof x === 'string') {
                x = JSON.parse(x);
            }
            var ds = this;
            Object.keys(x).forEach(function (ns) {
                ds.set(ns, x[ns]);
            });
            return ds;
        };
        /**
 * Return the names of all currently recognized datasources
 * @public
 * @returns {Array}
 */
        LocusZoom.DataSources.prototype.keys = function () {
            return Object.keys(this.sources);
        };
        /**
 * Datasources can be instantiated from a JSON object instead of code. This represents existing sources in that format.
 *   For example, this can be helpful when sharing plots, or to share settings with others when debugging
 * @public
 */
        LocusZoom.DataSources.prototype.toJSON = function () {
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
        LocusZoom.Data.Field = function (field) {
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
                this.transformations.forEach(function (transform, i) {
                    this.transformations[i] = LocusZoom.TransformationFunctions.get(transform);
                }.bind(this));
            }
            this.applyTransformations = function (val) {
                this.transformations.forEach(function (transform) {
                    val = transform(val);
                });
                return val;
            };
            // Resolve the field for a given data element.
            // First look for a full match with transformations already applied by the data requester.
            // Otherwise prefer a namespace match and fall back to just a name match, applying transformations on the fly.
            this.resolve = function (d) {
                if (typeof d[this.full_name] == 'undefined') {
                    var val = null;
                    if (typeof d[this.namespace + ':' + this.name] != 'undefined') {
                        val = d[this.namespace + ':' + this.name];
                    } else if (typeof d[this.name] != 'undefined') {
                        val = d[this.name];
                    }
                    d[this.full_name] = this.applyTransformations(val);
                }
                return d[this.full_name];
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
        LocusZoom.Data.Requester = function (sources) {
            function split_requests(fields) {
                // Given a fields array, return an object specifying what datasource names the data layer should make requests
                //  to, and how to handle the returned data
                var requests = {};
                // Regular expression finds namespace:field|trans
                var re = /^(?:([^:]+):)?([^:|]*)(\|.+)*$/;
                fields.forEach(function (raw) {
                    var parts = re.exec(raw);
                    var ns = parts[1] || 'base';
                    var field = parts[2];
                    var trans = LocusZoom.TransformationFunctions.get(parts[3]);
                    if (typeof requests[ns] == 'undefined') {
                        requests[ns] = {
                            outnames: [],
                            fields: [],
                            trans: []
                        };
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
            this.getData = function (state, fields) {
                var requests = split_requests(fields);
                // Create an array of functions that, when called, will trigger the request to the specified datasource
                var request_handles = Object.keys(requests).map(function (key) {
                    if (!sources.get(key)) {
                        throw 'Datasource for namespace ' + key + ' not found';
                    }
                    return sources.get(key).getData(state, requests[key].fields, requests[key].outnames, requests[key].trans);
                });
                //assume the fields are requested in dependent order
                //TODO: better manage dependencies
                var ret = Q.when({
                    header: {},
                    body: [],
                    discrete: {}
                });
                for (var i = 0; i < request_handles.length; i++) {
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
        LocusZoom.Data.Source = function () {
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
        LocusZoom.Data.Source.prototype.parseInit = function (init) {
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
                throw 'Source not initialized with required URL';
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
        LocusZoom.Data.Source.prototype.getCacheKey = function (state, chain, fields) {
            return this.getURL && this.getURL(state, chain, fields);
        };
        /**
 * Stub: build the URL for any requests made by this source.
 */
        LocusZoom.Data.Source.prototype.getURL = function (state, chain, fields) {
            return this.url;
        };
        /**
 * Perform a network request to fetch data for this source
 * @protected
 * @param {Object} state The state of the parent plot
 * @param chain
 * @param fields
 */
        LocusZoom.Data.Source.prototype.fetchRequest = function (state, chain, fields) {
            var url = this.getURL(state, chain, fields);
            return LocusZoom.createCORSPromise('GET', url);
        };
        /**
 * Gets the data for just this source, typically via a network request (caching where possible)
 * @protected
 */
        LocusZoom.Data.Source.prototype.getRequest = function (state, chain, fields) {
            var req;
            var cacheKey = this.getCacheKey(state, chain, fields);
            if (this.enableCache && typeof cacheKey !== 'undefined' && cacheKey === this._cachedKey) {
                req = Q.when(this._cachedResponse);
            } else {
                req = this.fetchRequest(state, chain, fields);
                if (this.enableCache) {
                    req = req.then(function (x) {
                        this._cachedKey = cacheKey;
                        return this._cachedResponse = x;
                    }.bind(this));
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
        LocusZoom.Data.Source.prototype.getData = function (state, fields, outnames, trans) {
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
            return function (chain) {
                if (self.dependentSource && chain && chain.body && !chain.body.length) {
                    // A "dependent" source should not attempt to fire a request if there is no data for it to act on.
                    // Therefore, it should simply return the previous data chain.
                    return Q.when(chain);
                }
                return self.getRequest(state, chain, fields).then(function (resp) {
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
            var sameLength = keys.every(function (key) {
                var item = data[key];
                return item.length === N;
            });
            if (!sameLength) {
                throw this.constructor.SOURCE_NAME + ' expects a response in which all arrays of data are the same length';
            }
            // Go down the rows, and create an object for each record
            var records = [];
            var fields = Object.keys(data);
            for (var i = 0; i < N; i++) {
                var record = {};
                for (var j = 0; j < fields.length; j++) {
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
        LocusZoom.Data.Source.prototype.annotateData = function (records, chain) {
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
            fieldFound.forEach(function (v, i) {
                if (!v) {
                    throw 'field ' + fields[i] + ' not found in response for ' + outnames[i];
                }
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
        LocusZoom.Data.Source.prototype.parseResponse = function (resp, chain, fields, outnames, trans) {
            var source_id = this.source_id || this.constructor.SOURCE_NAME;
            if (!chain.discrete) {
                chain.discrete = {};
            }
            if (!resp) {
                // FIXME: Hack. Certain browser issues (such as mixed content warnings) are reported as a successful promise
                //  resolution, even though the request was aborted. This is difficult to reliably detect, and is most likely
                // to occur for annotation sources (such as from ExAC). If empty response is received, skip parsing and log.
                // FIXME: Throw an error after pending, eg https://github.com/konradjk/exac_browser/issues/345
                console.error('No usable response was returned for source: \'' + source_id + '\'. Parsing will be skipped.');
                return Q.when(chain);
            }
            var json = typeof resp == 'string' ? JSON.parse(resp) : resp;
            var self = this;
            // Perform the 4 steps of parsing the payload and return a combined chain object
            return Q.when(self.normalizeResponse(json.data || json)).then(function (standardized) {
                // Perform calculations on the data from just this source
                return Q.when(self.annotateData(standardized, chain));
            }).then(function (data) {
                return Q.when(self.extractFields(data, fields, outnames, trans));
            }).then(function (one_source_body) {
                // Store a copy of the data that would be returned by parsing this source in isolation (and taking the
                //   fields array into account). This is useful when we want to re-use the source output in many ways.
                chain.discrete[source_id] = one_source_body;
                return Q.when(self.combineChainBody(one_source_body, chain, fields, outnames, trans));
            }).then(function (new_body) {
                return {
                    header: chain.header || {},
                    discrete: chain.discrete,
                    body: new_body
                };
            });
        };
        /** @deprecated */
        LocusZoom.Data.Source.prototype.parseArraysToObjects = function (data, fields, outnames, trans) {
            console.warn('Warning: .parseArraysToObjects() is no longer used. A stub is provided for legacy use');
            var standard = this.normalizeResponse(data);
            return this.extractFields(standard, fields, outnames, trans);
        };
        /** @deprecated */
        LocusZoom.Data.Source.prototype.parseObjectsToObjects = function (data, fields, outnames, trans) {
            console.warn('Warning: .parseObjectsToObjects() is deprecated. Use .extractFields() instead');
            return this.extractFields(data, fields, outnames, trans);
        };
        /** @deprecated */
        LocusZoom.Data.Source.prototype.parseData = function (data, fields, outnames, trans) {
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
        LocusZoom.Data.Source.extend = function (constructorFun, uniqueName, base) {
            if (base) {
                if (Array.isArray(base)) {
                    base = LocusZoom.KnownDataSources.create.apply(null, base);
                } else if (typeof base === 'string') {
                    base = LocusZoom.KnownDataSources.get(base).prototype;
                } else if (typeof base === 'function') {
                    base = base.prototype;
                }
            } else {
                base = new LocusZoom.Data.Source();
            }
            constructorFun = constructorFun || function () {
            };
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
        LocusZoom.Data.Source.prototype.toJSON = function () {
            return [
                Object.getPrototypeOf(this).constructor.SOURCE_NAME,
                {
                    url: this.url,
                    params: this.params
                }
            ];
        };
        /**
 * Data Source for Association Data, as fetched from the LocusZoom API server (or compatible)
 * @class
 * @public
 * @augments LocusZoom.Data.Source
 */
        LocusZoom.Data.AssociationSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'AssociationLZ');
        LocusZoom.Data.AssociationSource.prototype.preGetData = function (state, fields, outnames, trans) {
            var id_field = this.params.id_field || 'id';
            [
                id_field,
                'position'
            ].forEach(function (x) {
                if (fields.indexOf(x) === -1) {
                    fields.unshift(x);
                    outnames.unshift(x);
                    trans.unshift(null);
                }
            });
            return {
                fields: fields,
                outnames: outnames,
                trans: trans
            };
        };
        LocusZoom.Data.AssociationSource.prototype.getURL = function (state, chain, fields) {
            var analysis = state.analysis || chain.header.analysis || this.params.analysis;
            if (typeof analysis == 'undefined') {
                throw 'Association source must specify an analysis ID to plot';
            }
            return this.url + 'results/?filter=analysis in ' + analysis + ' and chromosome in  \'' + state.chr + '\'' + ' and position ge ' + state.start + ' and position le ' + state.end;
        };
        LocusZoom.Data.AssociationSource.prototype.normalizeResponse = function (data) {
            // Some association sources do not sort their data in a predictable order, which makes it hard to reliably
            //  align with other sources (such as LD). For performance reasons, sorting is an opt-in argument.
            // TODO: Consider more fine grained sorting control in the future
            data = LocusZoom.Data.Source.prototype.normalizeResponse.call(this, data);
            if (this.params && this.params.sort && data.length && data[0]['position']) {
                data.sort(function (a, b) {
                    return a['position'] - b['position'];
                });
            }
            return data;
        };
        /**
 * Data Source for LD Data, as fetched from the LocusZoom API server (or compatible)
 * This source is designed to connect its results to association data, and therefore depends on association data having
 *  been loaded by a previous request in the data chain.
 * @class
 * @public
 * @augments LocusZoom.Data.Source
 */
        LocusZoom.Data.LDSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
            this.dependentSource = true;
        }, 'LDLZ');
        LocusZoom.Data.LDSource.prototype.preGetData = function (state, fields) {
            if (fields.length > 1) {
                if (fields.length !== 2 || fields.indexOf('isrefvar') === -1) {
                    throw 'LD does not know how to get all fields: ' + fields.join(', ');
                }
            }
        };
        LocusZoom.Data.LDSource.prototype.findMergeFields = function (chain) {
            // since LD may be shared across sources with different namespaces
            // we use regex to find columns to join on rather than
            // requiring exact matches
            var exactMatch = function (arr) {
                return function () {
                    var regexes = arguments;
                    for (var i = 0; i < regexes.length; i++) {
                        var regex = regexes[i];
                        var m = arr.filter(function (x) {
                            return x.match(regex);
                        });
                        if (m.length) {
                            return m[0];
                        }
                    }
                    return null;
                };
            };
            var dataFields = {
                id: this.params.id_field,
                position: this.params.position_field,
                pvalue: this.params.pvalue_field,
                _names_: null
            };
            if (chain && chain.body && chain.body.length > 0) {
                var names = Object.keys(chain.body[0]);
                var nameMatch = exactMatch(names);
                dataFields.id = dataFields.id || nameMatch(/\bvariant\b/) || nameMatch(/\bid\b/);
                dataFields.position = dataFields.position || nameMatch(/\bposition\b/i, /\bpos\b/i);
                dataFields.pvalue = dataFields.pvalue || nameMatch(/\bpvalue\b/i, /\blog_pvalue\b/i);
                dataFields._names_ = names;
            }
            return dataFields;
        };
        LocusZoom.Data.LDSource.prototype.findRequestedFields = function (fields, outnames) {
            // Assumption: all usages of this source only ever ask for "isrefvar" or "state". This maps to output names.
            var obj = {};
            for (var i = 0; i < fields.length; i++) {
                if (fields[i] === 'isrefvar') {
                    obj.isrefvarin = fields[i];
                    obj.isrefvarout = outnames && outnames[i];
                } else {
                    obj.ldin = fields[i];
                    obj.ldout = outnames && outnames[i];
                }
            }
            return obj;
        };
        LocusZoom.Data.LDSource.prototype.normalizeResponse = function (data) {
            return data;
        };
        LocusZoom.Data.LDSource.prototype.getURL = function (state, chain, fields) {
            var findExtremeValue = function (x, pval, sign) {
                pval = pval || 'pvalue';
                sign = sign || 1;
                var extremeVal = x[0][pval], extremeIdx = 0;
                for (var i = 1; i < x.length; i++) {
                    if (x[i][pval] * sign > extremeVal) {
                        extremeVal = x[i][pval] * sign;
                        extremeIdx = i;
                    }
                }
                return extremeIdx;
            };
            var refSource = state.ldrefsource || chain.header.ldrefsource || 1;
            var reqFields = this.findRequestedFields(fields);
            var refVar = reqFields.ldin;
            if (refVar === 'state') {
                refVar = state.ldrefvar || chain.header.ldrefvar || 'best';
            }
            if (refVar === 'best') {
                if (!chain.body) {
                    throw 'No association data found to find best pvalue';
                }
                var keys = this.findMergeFields(chain);
                if (!keys.pvalue || !keys.id) {
                    var columns = '';
                    if (!keys.id) {
                        columns += (columns.length ? ', ' : '') + 'id';
                    }
                    if (!keys.pvalue) {
                        columns += (columns.length ? ', ' : '') + 'pvalue';
                    }
                    throw 'Unable to find necessary column(s) for merge: ' + columns + ' (available: ' + keys._names_ + ')';
                }
                refVar = chain.body[findExtremeValue(chain.body, keys.pvalue)][keys.id];
            }
            if (!chain.header) {
                chain.header = {};
            }
            chain.header.ldrefvar = refVar;
            return this.url + 'results/?filter=reference eq ' + refSource + ' and chromosome2 eq \'' + state.chr + '\'' + ' and position2 ge ' + state.start + ' and position2 le ' + state.end + ' and variant1 eq \'' + refVar + '\'' + '&fields=chr,pos,rsquare';
        };
        LocusZoom.Data.LDSource.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
            var keys = this.findMergeFields(chain);
            var reqFields = this.findRequestedFields(fields, outnames);
            if (!keys.position) {
                throw 'Unable to find position field for merge: ' + keys._names_;
            }
            var leftJoin = function (left, right, lfield, rfield) {
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
            var tagRefVariant = function (data, refvar, idfield, outrefname, outldname) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i][idfield] && data[i][idfield] === refvar) {
                        data[i][outrefname] = 1;
                        data[i][outldname] = 1;    // For label/filter purposes, implicitly mark the ref var as LD=1 to itself
                    } else {
                        data[i][outrefname] = 0;
                    }
                }
            };
            leftJoin(chain.body, data, reqFields.ldout, 'rsquare');
            if (reqFields.isrefvarin && chain.header.ldrefvar) {
                tagRefVariant(chain.body, chain.header.ldrefvar, keys.id, reqFields.isrefvarout, reqFields.ldout);
            }
            return chain.body;
        };
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
        LocusZoom.Data.GwasCatalog = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
            this.dependentSource = true;
        }, 'GwasCatalogLZ');
        LocusZoom.Data.GwasCatalog.prototype.getURL = function (state, chain, fields) {
            // This is intended to be aligned with another source- we will assume they are always ordered by position, asc
            //  (regardless of the actual match field)
            var catalog = this.params.source || 2;
            return this.url + '?format=objects&sort=pos&filter=id eq ' + catalog + ' and chrom eq \'' + state.chr + '\'' + ' and pos ge ' + state.start + ' and pos le ' + state.end;
        };
        LocusZoom.Data.GwasCatalog.prototype.findMergeFields = function (records) {
            // Data from previous sources is already namespaced. Find the alignment field by matching.
            var knownFields = Object.keys(records);
            // Note: All API endoints involved only give results for 1 chromosome at a time; match is implied
            var posMatch = knownFields.find(function (item) {
                return item.match(/\b(position|pos)\b/i);
            });
            if (!posMatch) {
                throw 'Could not find data to align with GWAS catalog results';
            }
            return { 'pos': posMatch };
        };
        // Skip the "individual field extraction" step; extraction will be handled when building chain body instead
        LocusZoom.Data.GwasCatalog.prototype.extractFields = function (data, fields, outnames, trans) {
            return data;
        };
        LocusZoom.Data.GwasCatalog.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
            if (!data.length) {
                return chain.body;
            }
            var decider = 'log_pvalue';
            //  TODO: Better reuse options in the future
            var decider_out = outnames[fields.indexOf(decider)];
            function leftJoin(left, right, fields, outnames, trans) {
                // Add `fields` from `right` to `left`
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
        LocusZoom.Data.GeneSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'GeneLZ');
        LocusZoom.Data.GeneSource.prototype.getURL = function (state, chain, fields) {
            var source = state.source || chain.header.source || this.params.source || 2;
            return this.url + '?filter=source in ' + source + ' and chrom eq \'' + state.chr + '\'' + ' and start le ' + state.end + ' and end ge ' + state.start;
        };
        // Genes have a very complex internal data format. Bypass any record parsing, and provide the data layer with the
        // exact information returned by the API. (ignoring the fields array in the layout)
        LocusZoom.Data.GeneSource.prototype.normalizeResponse = function (data) {
            return data;
        };
        LocusZoom.Data.GeneSource.prototype.extractFields = function (data, fields, outnames, trans) {
            return data;
        };
        /**
 * Data Source for Gene Constraint Data, as fetched from the LocusZoom API server (or compatible)
 * @public
 * @class
 * @augments LocusZoom.Data.Source
*/
        LocusZoom.Data.GeneConstraintSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'GeneConstraintLZ');
        LocusZoom.Data.GeneConstraintSource.prototype.getURL = function () {
            return this.url;
        };
        LocusZoom.Data.GeneConstraintSource.prototype.normalizeResponse = function (data) {
            return data;
        };
        LocusZoom.Data.GeneConstraintSource.prototype.getCacheKey = function (state, chain, fields) {
            return this.url + JSON.stringify(state);
        };
        LocusZoom.Data.GeneConstraintSource.prototype.fetchRequest = function (state, chain, fields) {
            var geneids = [];
            chain.body.forEach(function (gene) {
                var gene_id = gene.gene_id;
                if (gene_id.indexOf('.')) {
                    gene_id = gene_id.substr(0, gene_id.indexOf('.'));
                }
                geneids.push(gene_id);
            });
            var url = this.getURL(state, chain, fields);
            var body = 'geneids=' + encodeURIComponent(JSON.stringify(geneids));
            var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            return LocusZoom.createCORSPromise('POST', url, body, headers);
        };
        LocusZoom.Data.GeneConstraintSource.prototype.combineChainBody = function (data, chain, fields, outnames, trans) {
            if (!data) {
                return chain;
            }
            var constraint_fields = [
                'bp',
                'exp_lof',
                'exp_mis',
                'exp_syn',
                'lof_z',
                'mis_z',
                'mu_lof',
                'mu_mis',
                'mu_syn',
                'n_exons',
                'n_lof',
                'n_mis',
                'n_syn',
                'pLI',
                'syn_z'
            ];
            chain.body.forEach(function (gene, i) {
                var gene_id = gene.gene_id;
                if (gene_id.indexOf('.')) {
                    gene_id = gene_id.substr(0, gene_id.indexOf('.'));
                }
                constraint_fields.forEach(function (field) {
                    // Do not overwrite any fields defined in the original gene source
                    if (typeof chain.body[i][field] != 'undefined') {
                        return;
                    }
                    if (data[gene_id]) {
                        var val = data[gene_id][field];
                        if (typeof val == 'number' && val.toString().indexOf('.') !== -1) {
                            val = parseFloat(val.toFixed(2));
                        }
                        chain.body[i][field] = val;
                    } else {
                        // If the gene did not come back in the response then set the same field with a null values
                        chain.body[i][field] = null;
                    }
                });
            });
            return chain.body;
        };
        /**
 * Data Source for Recombination Rate Data, as fetched from the LocusZoom API server (or compatible)
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
        LocusZoom.Data.RecombinationRateSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'RecombLZ');
        LocusZoom.Data.RecombinationRateSource.prototype.getURL = function (state, chain, fields) {
            var source = state.recombsource || chain.header.recombsource || this.params.source || 15;
            return this.url + '?filter=id in ' + source + ' and chromosome eq \'' + state.chr + '\'' + ' and position le ' + state.end + ' and position ge ' + state.start;
        };
        /**
 * Data Source for Interval Annotation Data (e.g. BED Tracks), as fetched from the LocusZoom API server (or compatible)
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
        LocusZoom.Data.IntervalSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'IntervalLZ');
        LocusZoom.Data.IntervalSource.prototype.getURL = function (state, chain, fields) {
            var source = state.bedtracksource || chain.header.bedtracksource || this.params.source || 16;
            return this.url + '?filter=id in ' + source + ' and chromosome eq \'' + state.chr + '\'' + ' and start le ' + state.end + ' and end ge ' + state.start;
        };
        /**
 * Data Source for static blobs of JSON Data. This does not perform additional parsing, and therefore it is the
 * responsibility of the user to pass information in a format that can be read and understood by the chosen plot.
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 */
        LocusZoom.Data.StaticSource = LocusZoom.Data.Source.extend(function (data) {
            /** @member {Object} */
            this._data = data;
        }, 'StaticJSON');
        LocusZoom.Data.StaticSource.prototype.getRequest = function (state, chain, fields) {
            return Q.fcall(function () {
                return this._data;
            }.bind(this));
        };
        LocusZoom.Data.StaticSource.prototype.toJSON = function () {
            return [
                Object.getPrototypeOf(this).constructor.SOURCE_NAME,
                this._data
            ];
        };
        /**
 * Data source for PheWAS data served from external JSON files
 * @public
 * @class
 * @augments LocusZoom.Data.Source
 * @param {String[]} init.build This datasource expects to be provided the name of the genome build that will be used to
 *   provide pheWAS results for this position. Note positions may not translate between builds.
 */
        LocusZoom.Data.PheWASSource = LocusZoom.Data.Source.extend(function (init) {
            this.parseInit(init);
        }, 'PheWASLZ');
        LocusZoom.Data.PheWASSource.prototype.getURL = function (state, chain, fields) {
            var build = this.params.build;
            if (!build || !Array.isArray(build) || !build.length) {
                throw [
                    'Data source',
                    this.constructor.SOURCE_NAME,
                    'requires that you specify array of one or more desired genome build names'
                ].join(' ');
            }
            var url = [
                this.url,
                '?filter=variant eq \'',
                encodeURIComponent(state.variant),
                '\'&format=objects&',
                build.map(function (item) {
                    return 'build=' + encodeURIComponent(item);
                }).join('&')
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
        LocusZoom.Data.ConnectorSource = LocusZoom.Data.Source.extend(function (init) {
            if (!init || !init.sources) {
                throw 'Connectors must specify the data they require as init.sources = {internal_name: chain_source_id}} pairs';
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
                    throw 'Configuration for ' + self.constructor.SOURCE_NAME + ' must specify a source ID corresponding to ' + k;
                }
            });
            this.parseInit(init);
        }, 'ConnectorSource');
        /** @property {String[]} Specifies the sources that must be provided in the original config object */
        LocusZoom.Data.ConnectorSource.prototype.REQUIRED_SOURCES = [];
        LocusZoom.Data.ConnectorSource.prototype.parseInit = function (init) {
        };
        // Stub
        LocusZoom.Data.ConnectorSource.prototype.getRequest = function (state, chain, fields) {
            // Connectors do not request their own data by definition, but they *do* depend on other sources having been loaded
            //  first. This method performs basic validation, and preserves the accumulated body from the chain so far.
            var self = this;
            Object.keys(this._source_name_mapping).forEach(function (ns) {
                var chain_source_id = self._source_name_mapping[ns];
                if (chain.discrete && !chain.discrete[chain_source_id]) {
                    throw self.constructor.SOURCE_NAME + ' cannot be used before loading required data for: ' + chain_source_id;
                }
            });
            return Q.when(chain.body || []);
        };
        LocusZoom.Data.ConnectorSource.prototype.parseResponse = function (data, chain, fields, outnames, trans) {
            // A connector source does not update chain.discrete, but it may use it. It bypasses data formatting
            //  and field selection (both are assumed to have been done already, by the previous sources this draws from)
            // Because of how the chain works, connectors are not very good at applying new transformations or namespacing.
            // Typically connectors are called with `connector_name:all` in the fields array.
            return Q.when(this.combineChainBody(data, chain, fields, outnames, trans)).then(function (new_body) {
                return {
                    header: chain.header || {},
                    discrete: chain.discrete || {},
                    body: new_body
                };
            });
        };
        LocusZoom.Data.ConnectorSource.prototype.combineChainBody = function (records, chain) {
            // Stub method: specifies how to combine the data
            throw 'This method must be implemented in a subclass';
        };
        /* global LocusZoom */
        'use strict';
        /**
 * An independent LocusZoom object that renders a unique set of data and subpanels.
 * Many such LocusZoom objects can exist simultaneously on a single page, each having its own layout.
 *
 * This creates a new plot instance, but does not immediately render it. For practical use, it may be more convenient
 * to use the `LocusZoom.populate` helper method.
 *
 * @class
 * @param {String} id The ID of the plot. Often corresponds to the ID of the container element on the page
 *   where the plot is rendered..
 * @param {LocusZoom.DataSources} datasource Ensemble of data providers used by the plot
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
*/
        LocusZoom.Plot = function (id, datasource, layout) {
            /** @member Boolean} */
            this.initialized = false;
            // TODO: This makes sense for all other locuszoom elements to have; determine whether this is interface boilerplate or something that can be removed
            this.parent_plot = this;
            /** @member {String} */
            this.id = id;
            /** @member {Element} */
            this.container = null;
            /**
     * Selector for a node that will contain the plot. (set externally by populate methods)
     * @member {d3.selection}
     */
            this.svg = null;
            /** @member {Object.<String, Number>} */
            this.panels = {};
            /**
     * TODO: This is currently used by external classes that manipulate the parent and may indicate room for a helper method in the api to coordinate boilerplate
     * @protected
     * @member {String[]}
     */
            this.panel_ids_by_y_index = [];
            /**
     * Notify each child panel of the plot of changes in panel ordering/ arrangement
     */
            this.applyPanelYIndexesToPanelLayouts = function () {
                this.panel_ids_by_y_index.forEach(function (pid, idx) {
                    this.panels[pid].layout.y_index = idx;
                }.bind(this));
            };
            /**
     * Get the qualified ID pathname for the plot
     * @returns {String}
     */
            this.getBaseId = function () {
                return this.id;
            };
            /**
     * Track update operations (reMap) performed on all child panels, and notify the parent plot when complete
     * TODO: Reconsider whether we need to be tracking this as global state outside of context of specific operations
     * @protected
     * @member {Promise[]}
     */
            this.remap_promises = [];
            if (typeof layout == 'undefined') {
                /**
         * The layout is a serializable object used to describe the composition of the Plot
         *   If no layout was passed, use the Standard Association Layout
         *   Otherwise merge whatever was passed with the Default Layout
         *   TODO: Review description; we *always* merge with default layout?
         * @member {Object}
         */
                this.layout = LocusZoom.Layouts.merge({}, LocusZoom.Layouts.get('plot', 'standard_association'));
            } else {
                this.layout = layout;
            }
            LocusZoom.Layouts.merge(this.layout, LocusZoom.Plot.DefaultLayout);
            /**
     * Values in the layout object may change during rendering etc. Retain a copy of the original plot state
     * @member {Object}
     */
            this._base_layout = JSON.parse(JSON.stringify(this.layout));
            /**
     * Create a shortcut to the state in the layout on the Plot. Tracking in the layout allows the plot to be created
     *   with initial state/setup.
     *
     * Tracks state of the plot, eg start and end position
     * @member {Object}
     */
            this.state = this.layout.state;
            /** @member {LocusZoom.Data.Requester} */
            this.lzd = new LocusZoom.Data.Requester(datasource);
            /**
     * Window.onresize listener (responsive layouts only)
     * TODO: .on appears to return a selection, not a listener? Check logic here
     * https://github.com/d3/d3-selection/blob/00b904b9bcec4dfaf154ae0bbc777b1fc1d7bc08/test/selection/on-test.js#L11
     * @deprecated
     * @member {d3.selection}
     */
            this.window_onresize = null;
            /**
     * Known event hooks that the panel can respond to
     * @protected
     * @member {Object}
     */
            this.event_hooks = {
                'layout_changed': [],
                'data_requested': [],
                'data_rendered': [],
                'element_clicked': [],
                'element_selection': [],
                'state_changed': []    // Only triggered when a state change causes rerender
            };
            /**
     * @callback eventCallback
     * @param {object} eventData A description of the event
     * @param {String|null} eventData.sourceID The unique identifier (eg plot or parent name) of the element that
     *  triggered the event. Will be automatically filled in if not explicitly provided.
     * @param {Object|null} eventData.context Any additional information to be passed to the callback, eg the data
     *   associated with a clicked plot element
     */
            /**
     * There are several events that a LocusZoom plot can "emit" when appropriate, and LocusZoom supports registering
     *   "hooks" for these events which are essentially custom functions intended to fire at certain times.
     *
     * The following plot-level events are currently supported:
     *   - `layout_changed` - context: plot - Any aspect of the plot's layout (including dimensions or state) has changed.
     *   - `data_requested` - context: plot - A request for new data from any data source used in the plot has been made.
     *   - `data_rendered` - context: plot - Data from a request has been received and rendered in the plot.
     *   - `element_clicked` - context: plot - A data element in any of the plot's data layers has been clicked.
     *   - `element_selection` - context: plot - Triggered when an element changes "selection" status, and identifies
     *        whether the element is being selected or deselected.
     *
     * To register a hook for any of these events use `plot.on('event_name', function() {})`.
     *
     * There can be arbitrarily many functions registered to the same event. They will be executed in the order they
     *   were registered. The this context bound to each event hook function is dependent on the type of event, as
     *   denoted above. For example, when data_requested is emitted the context for this in the event hook will be the
     *   plot itself, but when element_clicked is emitted the context for this in the event hook will be the element
     *   that was clicked.
     *
     * @param {String} event The name of an event (as defined in `event_hooks`)
     * @param {eventCallback} hook
     * @returns {function} The registered event listener
     */
            this.on = function (event, hook) {
                if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
                    throw 'Unable to register event hook, invalid event: ' + event.toString();
                }
                if (typeof hook != 'function') {
                    throw 'Unable to register event hook, invalid hook function passed';
                }
                this.event_hooks[event].push(hook);
                return hook;
            };
            /**
     * Remove one or more previously defined event listeners
     * @param {String} event The name of an event (as defined in `event_hooks`)
     * @param {eventCallback} [hook] The callback to deregister
     * @returns {LocusZoom.Plot}
     */
            this.off = function (event, hook) {
                var theseHooks = this.event_hooks[event];
                if (typeof 'event' != 'string' || !Array.isArray(theseHooks)) {
                    throw 'Unable to remove event hook, invalid event: ' + event.toString();
                }
                if (hook === undefined) {
                    // Deregistering all hooks for this event may break basic functionality, and should only be used during
                    //  cleanup operations (eg to prevent memory leaks)
                    this.event_hooks[event] = [];
                } else {
                    var hookMatch = theseHooks.indexOf(hook);
                    if (hookMatch !== -1) {
                        theseHooks.splice(hookMatch, 1);
                    } else {
                        throw 'The specified event listener is not registered and therefore cannot be removed';
                    }
                }
                return this;
            };
            /**
     * Handle running of event hooks when an event is emitted
     * @param {string} event A known event name
     * @param {*} eventData Data or event description that will be passed to the event listener
     * @returns {LocusZoom.Plot}
     */
            this.emit = function (event, eventData) {
                // TODO: there are small differences between the emit implementation between plots and panels. In the future,
                //  DRY this code via mixins, and make sure to keep the interfaces compatible when refactoring.
                if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
                    throw 'LocusZoom attempted to throw an invalid event: ' + event.toString();
                }
                var sourceID = this.getBaseId();
                var self = this;
                this.event_hooks[event].forEach(function (hookToRun) {
                    var eventContext;
                    if (eventData && eventData.sourceID) {
                        // If we detect that an event originated elsewhere (via bubbling or externally), preserve the context
                        //  when re-emitting the event to plot-level listeners
                        eventContext = eventData;
                    } else {
                        eventContext = {
                            sourceID: sourceID,
                            data: eventData || null
                        };
                    }
                    // By default, any handlers fired here (either directly, or bubbled) will see the plot as the
                    //  value of `this`. If a bound function is registered as a handler, the previously bound `this` will
                    //  override anything provided to `call` below.
                    hookToRun.call(self, eventContext);
                });
                return this;
            };
            /**
     * Get an object with the x and y coordinates of the plot's origin in terms of the entire page
     * Necessary for positioning any HTML elements over the plot
     * @returns {{x: Number, y: Number, width: Number, height: Number}}
     */
            this.getPageOrigin = function () {
                var bounding_client_rect = this.svg.node().getBoundingClientRect();
                var x_offset = document.documentElement.scrollLeft || document.body.scrollLeft;
                var y_offset = document.documentElement.scrollTop || document.body.scrollTop;
                var container = this.svg.node();
                while (container.parentNode !== null) {
                    container = container.parentNode;
                    if (container !== document && d3.select(container).style('position') !== 'static') {
                        x_offset = -1 * container.getBoundingClientRect().left;
                        y_offset = -1 * container.getBoundingClientRect().top;
                        break;
                    }
                }
                return {
                    x: x_offset + bounding_client_rect.left,
                    y: y_offset + bounding_client_rect.top,
                    width: bounding_client_rect.width,
                    height: bounding_client_rect.height
                };
            };
            /**
     * Get the top and left offset values for the plot's container element (the div that was populated)
     * @returns {{top: number, left: number}}
     */
            this.getContainerOffset = function () {
                var offset = {
                    top: 0,
                    left: 0
                };
                var container = this.container.offsetParent || null;
                while (container !== null) {
                    offset.top += container.offsetTop;
                    offset.left += container.offsetLeft;
                    container = container.offsetParent || null;
                }
                return offset;
            };
            //
            /**
     * Event information describing interaction (e.g. panning and zooming) is stored on the plot
     * TODO: Add/ document details of interaction structure as we expand
     * @member {{panel_id: String, linked_panel_ids: Array, x_linked: *, dragging: *, zooming: *}}
     * @returns {LocusZoom.Plot}
     */
            this.interaction = {};
            /**
     * Track whether the target panel can respond to mouse interaction events
     * @param {String} panel_id
     * @returns {boolean}
     */
            this.canInteract = function (panel_id) {
                panel_id = panel_id || null;
                if (panel_id) {
                    return (typeof this.interaction.panel_id == 'undefined' || this.interaction.panel_id === panel_id) && !this.loading_data;
                } else {
                    return !(this.interaction.dragging || this.interaction.zooming || this.loading_data);
                }
            };
            // Initialize the layout
            this.initializeLayout();
            // TODO: Possibly superfluous return from constructor
            return this;
        };
        /**
 * Default/ expected configuration parameters for basic plotting; most plots will override
 *
 * @protected
 * @static
 * @type {Object}
 */
        LocusZoom.Plot.DefaultLayout = {
            state: {},
            width: 1,
            height: 1,
            min_width: 1,
            min_height: 1,
            responsive_resize: false,
            aspect_ratio: 1,
            panels: [],
            dashboard: { components: [] },
            panel_boundaries: true,
            mouse_guide: true
        };
        /**
 * Helper method to sum the proportional dimensions of panels, a value that's checked often as panels are added/removed
 * @param {('Height'|'Width')} dimension
 * @returns {number}
 */
        LocusZoom.Plot.prototype.sumProportional = function (dimension) {
            if (dimension !== 'height' && dimension !== 'width') {
                throw 'Bad dimension value passed to LocusZoom.Plot.prototype.sumProportional';
            }
            var total = 0;
            for (var id in this.panels) {
                // Ensure every panel contributing to the sum has a non-zero proportional dimension
                if (!this.panels[id].layout['proportional_' + dimension]) {
                    this.panels[id].layout['proportional_' + dimension] = 1 / Object.keys(this.panels).length;
                }
                total += this.panels[id].layout['proportional_' + dimension];
            }
            return total;
        };
        /**
 * Resize the plot to fit the bounding container
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.rescaleSVG = function () {
            var clientRect = this.svg.node().getBoundingClientRect();
            this.setDimensions(clientRect.width, clientRect.height);
            return this;
        };
        /**
 * Prepare the plot for first use by performing parameter validation, setting up panels, and calculating dimensions
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.initializeLayout = function () {
            // Sanity check layout values
            // TODO: Find a way to generally abstract this, maybe into an object that models allowed layout values?
            if (isNaN(this.layout.width) || this.layout.width <= 0) {
                throw 'Plot layout parameter `width` must be a positive number';
            }
            if (isNaN(this.layout.height) || this.layout.height <= 0) {
                throw 'Plot layout parameter `width` must be a positive number';
            }
            if (isNaN(this.layout.aspect_ratio) || this.layout.aspect_ratio <= 0) {
                throw 'Plot layout parameter `aspect_ratio` must be a positive number';
            }
            // If this is a responsive layout then set a namespaced/unique onresize event listener on the window
            if (this.layout.responsive_resize) {
                this.window_onresize = d3.select(window).on('resize.lz-' + this.id, function () {
                    this.rescaleSVG();
                }.bind(this));
                // Forcing one additional setDimensions() call after the page is loaded clears up
                // any disagreements between the initial layout and the loaded responsive container's size
                d3.select(window).on('load.lz-' + this.id, function () {
                    this.setDimensions();
                }.bind(this));
            }
            // Add panels
            this.layout.panels.forEach(function (panel_layout) {
                this.addPanel(panel_layout);
            }.bind(this));
            return this;
        };
        /**
 * Set the dimensions for a plot, and ensure that panels are sized and positioned correctly.
 *
 * If dimensions are provided, resizes each panel proportionally to match the new plot dimensions. Otherwise,
 *   calculates the appropriate plot dimensions based on all panels.
 * @param {Number} [width] If provided and larger than minimum size, set plot to this width
 * @param {Number} [height] If provided and larger than minimum size, set plot to this height
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.setDimensions = function (width, height) {
            var id;
            // Update minimum allowable width and height by aggregating minimums from panels, then apply minimums to containing element.
            var min_width = parseFloat(this.layout.min_width) || 0;
            var min_height = parseFloat(this.layout.min_height) || 0;
            for (id in this.panels) {
                min_width = Math.max(min_width, this.panels[id].layout.min_width);
                if (parseFloat(this.panels[id].layout.min_height) > 0 && parseFloat(this.panels[id].layout.proportional_height) > 0) {
                    min_height = Math.max(min_height, this.panels[id].layout.min_height / this.panels[id].layout.proportional_height);
                }
            }
            this.layout.min_width = Math.max(min_width, 1);
            this.layout.min_height = Math.max(min_height, 1);
            d3.select(this.svg.node().parentNode).style({
                'min-width': this.layout.min_width + 'px',
                'min-height': this.layout.min_height + 'px'
            });
            // If width and height arguments were passed then adjust them against plot minimums if necessary.
            // Then resize the plot and proportionally resize panels to fit inside the new plot dimensions.
            if (!isNaN(width) && width >= 0 && !isNaN(height) && height >= 0) {
                this.layout.width = Math.max(Math.round(+width), this.layout.min_width);
                this.layout.height = Math.max(Math.round(+height), this.layout.min_height);
                this.layout.aspect_ratio = this.layout.width / this.layout.height;
                // Override discrete values if resizing responsively
                if (this.layout.responsive_resize) {
                    if (this.svg) {
                        this.layout.width = Math.max(this.svg.node().parentNode.getBoundingClientRect().width, this.layout.min_width);
                    }
                    this.layout.height = this.layout.width / this.layout.aspect_ratio;
                    if (this.layout.height < this.layout.min_height) {
                        this.layout.height = this.layout.min_height;
                        this.layout.width = this.layout.height * this.layout.aspect_ratio;
                    }
                }
                // Resize/reposition panels to fit, update proportional origins if necessary
                var y_offset = 0;
                this.panel_ids_by_y_index.forEach(function (panel_id) {
                    var panel_width = this.layout.width;
                    var panel_height = this.panels[panel_id].layout.proportional_height * this.layout.height;
                    this.panels[panel_id].setDimensions(panel_width, panel_height);
                    this.panels[panel_id].setOrigin(0, y_offset);
                    this.panels[panel_id].layout.proportional_origin.x = 0;
                    this.panels[panel_id].layout.proportional_origin.y = y_offset / this.layout.height;
                    y_offset += panel_height;
                    this.panels[panel_id].dashboard.update();
                }.bind(this));
            }    // If width and height arguments were NOT passed (and panels exist) then determine the plot dimensions
                 // by making it conform to panel dimensions, assuming panels are already positioned correctly.
            else if (Object.keys(this.panels).length) {
                this.layout.width = 0;
                this.layout.height = 0;
                for (id in this.panels) {
                    this.layout.width = Math.max(this.panels[id].layout.width, this.layout.width);
                    this.layout.height += this.panels[id].layout.height;
                }
                this.layout.width = Math.max(this.layout.width, this.layout.min_width);
                this.layout.height = Math.max(this.layout.height, this.layout.min_height);
            }
            // Keep aspect ratio in agreement with dimensions
            this.layout.aspect_ratio = this.layout.width / this.layout.height;
            // Apply layout width and height as discrete values or viewbox values
            if (this.svg !== null) {
                if (this.layout.responsive_resize) {
                    this.svg.attr('viewBox', '0 0 ' + this.layout.width + ' ' + this.layout.height).attr('preserveAspectRatio', 'xMinYMin meet');
                } else {
                    this.svg.attr('width', this.layout.width).attr('height', this.layout.height);
                }
            }
            // If the plot has been initialized then trigger some necessary render functions
            if (this.initialized) {
                this.panel_boundaries.position();
                this.dashboard.update();
                this.curtain.update();
                this.loader.update();
            }
            return this.emit('layout_changed');
        };
        /**
 * Create a new panel from a layout, and handle the work of initializing and placing the panel on the plot
 * @param {Object} layout
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Plot.prototype.addPanel = function (layout) {
            // Sanity checks
            if (typeof layout !== 'object') {
                throw 'Invalid panel layout passed to LocusZoom.Plot.prototype.addPanel()';
            }
            // Create the Panel and set its parent
            var panel = new LocusZoom.Panel(layout, this);
            // Store the Panel on the Plot
            this.panels[panel.id] = panel;
            // If a discrete y_index was set in the layout then adjust other panel y_index values to accommodate this one
            if (panel.layout.y_index !== null && !isNaN(panel.layout.y_index) && this.panel_ids_by_y_index.length > 0) {
                // Negative y_index values should count backwards from the end, so convert negatives to appropriate values here
                if (panel.layout.y_index < 0) {
                    panel.layout.y_index = Math.max(this.panel_ids_by_y_index.length + panel.layout.y_index, 0);
                }
                this.panel_ids_by_y_index.splice(panel.layout.y_index, 0, panel.id);
                this.applyPanelYIndexesToPanelLayouts();
            } else {
                var length = this.panel_ids_by_y_index.push(panel.id);
                this.panels[panel.id].layout.y_index = length - 1;
            }
            // Determine if this panel was already in the layout.panels array.
            // If it wasn't, add it. Either way store the layout.panels array index on the panel.
            var layout_idx = null;
            this.layout.panels.forEach(function (panel_layout, idx) {
                if (panel_layout.id === panel.id) {
                    layout_idx = idx;
                }
            });
            if (layout_idx === null) {
                layout_idx = this.layout.panels.push(this.panels[panel.id].layout) - 1;
            }
            this.panels[panel.id].layout_idx = layout_idx;
            // Call positionPanels() to keep panels from overlapping and ensure filling all available vertical space
            if (this.initialized) {
                this.positionPanels();
                // Initialize and load data into the new panel
                this.panels[panel.id].initialize();
                this.panels[panel.id].reMap();
                // An extra call to setDimensions with existing discrete dimensions fixes some rounding errors with tooltip
                // positioning. TODO: make this additional call unnecessary.
                this.setDimensions(this.layout.width, this.layout.height);
            }
            return this.panels[panel.id];
        };
        /**
 * Clear all state, tooltips, and other persisted data associated with one (or all) panel(s) in the plot
 *
 * This is useful when reloading an existing plot with new data, eg "click for genome region" links.
 *   This is a utility method for custom usage. It is not fired automatically during normal rerender of existing panels
 *   @param {String} [panelId] If provided, clear state for only this panel. Otherwise, clear state for all panels.
 *   @param {('wipe'|'reset')} [mode='wipe'] Optionally specify how state should be cleared. `wipe` deletes all data
 *     and is useful for when the panel is being removed; `reset` is best when the panel will be reused in place.
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.clearPanelData = function (panelId, mode) {
            mode = mode || 'wipe';
            // TODO: Add unit tests for this method
            var panelsList;
            if (panelId) {
                panelsList = [panelId];
            } else {
                panelsList = Object.keys(this.panels);
            }
            var self = this;
            panelsList.forEach(function (pid) {
                self.panels[pid].data_layer_ids_by_z_index.forEach(function (dlid) {
                    var layer = self.panels[pid].data_layers[dlid];
                    layer.destroyAllTooltips();
                    delete self.layout.state[pid + '.' + dlid];
                    if (mode === 'reset') {
                        layer.setDefaultState();
                    }
                });
            });
            return this;
        };
        /**
 * Remove the panel from the plot, and clear any state, tooltips, or other visual elements belonging to nested content
 * @param {String} id
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.removePanel = function (id) {
            if (!this.panels[id]) {
                throw 'Unable to remove panel, ID not found: ' + id;
            }
            // Hide all panel boundaries
            this.panel_boundaries.hide();
            // Destroy all tooltips and state vars for all data layers on the panel
            this.clearPanelData(id);
            // Remove all panel-level HTML overlay elements
            this.panels[id].loader.hide();
            this.panels[id].dashboard.destroy(true);
            this.panels[id].curtain.hide();
            // Remove the svg container for the panel if it exists
            if (this.panels[id].svg.container) {
                this.panels[id].svg.container.remove();
            }
            // Delete the panel and its presence in the plot layout and state
            this.layout.panels.splice(this.panels[id].layout_idx, 1);
            delete this.panels[id];
            delete this.layout.state[id];
            // Update layout_idx values for all remaining panels
            this.layout.panels.forEach(function (panel_layout, idx) {
                this.panels[panel_layout.id].layout_idx = idx;
            }.bind(this));
            // Remove the panel id from the y_index array
            this.panel_ids_by_y_index.splice(this.panel_ids_by_y_index.indexOf(id), 1);
            this.applyPanelYIndexesToPanelLayouts();
            // Call positionPanels() to keep panels from overlapping and ensure filling all available vertical space
            if (this.initialized) {
                // Allow the plot to shrink when panels are removed, by forcing it to recalculate min dimensions from scratch
                this.layout.min_height = this._base_layout.min_height;
                this.layout.min_width = this._base_layout.min_width;
                this.positionPanels();
                // An extra call to setDimensions with existing discrete dimensions fixes some rounding errors with tooltip
                // positioning. TODO: make this additional call unnecessary.
                this.setDimensions(this.layout.width, this.layout.height);
            }
            return this;
        };
        /**
 * Automatically position panels based on panel positioning rules and values.
 * Keep panels from overlapping vertically by adjusting origins, and keep the sum of proportional heights at 1.
 *
 * TODO: This logic currently only supports dynamic positioning of panels to prevent overlap in a VERTICAL orientation.
 *      Some framework exists for positioning panels in horizontal orientations as well (width, proportional_width, origin.x, etc.)
 *      but the logic for keeping these user-definable values straight approaches the complexity of a 2D box-packing algorithm.
 *      That's complexity we don't need right now, and may not ever need, so it's on hiatus until a use case materializes.
 */
        LocusZoom.Plot.prototype.positionPanels = function () {
            var id;
            // We want to enforce that all x-linked panels have consistent horizontal margins
            // (to ensure that aligned items stay aligned despite inconsistent initial layout parameters)
            // NOTE: This assumes panels have consistent widths already. That should probably be enforced too!
            var x_linked_margins = {
                left: 0,
                right: 0
            };
            // Proportional heights for newly added panels default to null unless explicitly set, so determine appropriate
            // proportional heights for all panels with a null value from discretely set dimensions.
            // Likewise handle default nulls for proportional widths, but instead just force a value of 1 (full width)
            for (id in this.panels) {
                if (this.panels[id].layout.proportional_height === null) {
                    this.panels[id].layout.proportional_height = this.panels[id].layout.height / this.layout.height;
                }
                if (this.panels[id].layout.proportional_width === null) {
                    this.panels[id].layout.proportional_width = 1;
                }
                if (this.panels[id].layout.interaction.x_linked) {
                    x_linked_margins.left = Math.max(x_linked_margins.left, this.panels[id].layout.margin.left);
                    x_linked_margins.right = Math.max(x_linked_margins.right, this.panels[id].layout.margin.right);
                }
            }
            // Sum the proportional heights and then adjust all proportionally so that the sum is exactly 1
            var total_proportional_height = this.sumProportional('height');
            if (!total_proportional_height) {
                return this;
            }
            var proportional_adjustment = 1 / total_proportional_height;
            for (id in this.panels) {
                this.panels[id].layout.proportional_height *= proportional_adjustment;
            }
            // Update origins on all panels without changing plot-level dimensions yet
            // Also apply x-linked margins to x-linked panels, updating widths as needed
            var y_offset = 0;
            this.panel_ids_by_y_index.forEach(function (panel_id) {
                this.panels[panel_id].setOrigin(0, y_offset);
                this.panels[panel_id].layout.proportional_origin.x = 0;
                y_offset += this.panels[panel_id].layout.height;
                if (this.panels[panel_id].layout.interaction.x_linked) {
                    var delta = Math.max(x_linked_margins.left - this.panels[panel_id].layout.margin.left, 0) + Math.max(x_linked_margins.right - this.panels[panel_id].layout.margin.right, 0);
                    this.panels[panel_id].layout.width += delta;
                    this.panels[panel_id].layout.margin.left = x_linked_margins.left;
                    this.panels[panel_id].layout.margin.right = x_linked_margins.right;
                    this.panels[panel_id].layout.cliparea.origin.x = x_linked_margins.left;
                }
            }.bind(this));
            var calculated_plot_height = y_offset;
            this.panel_ids_by_y_index.forEach(function (panel_id) {
                this.panels[panel_id].layout.proportional_origin.y = this.panels[panel_id].layout.origin.y / calculated_plot_height;
            }.bind(this));
            // Update dimensions on the plot to accommodate repositioned panels
            this.setDimensions();
            // Set dimensions on all panels using newly set plot-level dimensions and panel-level proportional dimensions
            this.panel_ids_by_y_index.forEach(function (panel_id) {
                this.panels[panel_id].setDimensions(this.layout.width * this.panels[panel_id].layout.proportional_width, this.layout.height * this.panels[panel_id].layout.proportional_height);
            }.bind(this));
            return this;
        };
        /**
 * Prepare the first rendering of the plot. This includes initializing the individual panels, but also creates shared
 *   elements such as mouse events, panel guides/boundaries, and loader/curtain.
 *
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.initialize = function () {
            // Ensure proper responsive class is present on the containing node if called for
            if (this.layout.responsive_resize) {
                d3.select(this.container).classed('lz-container-responsive', true);
            }
            // Create an element/layer for containing mouse guides
            if (this.layout.mouse_guide) {
                var mouse_guide_svg = this.svg.append('g').attr('class', 'lz-mouse_guide').attr('id', this.id + '.mouse_guide');
                var mouse_guide_vertical_svg = mouse_guide_svg.append('rect').attr('class', 'lz-mouse_guide-vertical').attr('x', -1);
                var mouse_guide_horizontal_svg = mouse_guide_svg.append('rect').attr('class', 'lz-mouse_guide-horizontal').attr('y', -1);
                this.mouse_guide = {
                    svg: mouse_guide_svg,
                    vertical: mouse_guide_vertical_svg,
                    horizontal: mouse_guide_horizontal_svg
                };
            }
            // Add curtain and loader prototpyes to the plot
            this.curtain = LocusZoom.generateCurtain.call(this);
            this.loader = LocusZoom.generateLoader.call(this);
            // Create the panel_boundaries object with show/position/hide methods
            this.panel_boundaries = {
                parent: this,
                hide_timeout: null,
                showing: false,
                dragging: false,
                selectors: [],
                corner_selector: null,
                show: function () {
                    // Generate panel boundaries
                    if (!this.showing && !this.parent.curtain.showing) {
                        this.showing = true;
                        // Loop through all panels to create a horizontal boundary for each
                        this.parent.panel_ids_by_y_index.forEach(function (panel_id, panel_idx) {
                            var selector = d3.select(this.parent.svg.node().parentNode).insert('div', '.lz-data_layer-tooltip').attr('class', 'lz-panel-boundary').attr('title', 'Resize panel');
                            selector.append('span');
                            var panel_resize_drag = d3.behavior.drag();
                            panel_resize_drag.on('dragstart', function () {
                                this.dragging = true;
                            }.bind(this));
                            panel_resize_drag.on('dragend', function () {
                                this.dragging = false;
                            }.bind(this));
                            panel_resize_drag.on('drag', function () {
                                // First set the dimensions on the panel we're resizing
                                var this_panel = this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]];
                                var original_panel_height = this_panel.layout.height;
                                this_panel.setDimensions(this_panel.layout.width, this_panel.layout.height + d3.event.dy);
                                var panel_height_change = this_panel.layout.height - original_panel_height;
                                var new_calculated_plot_height = this.parent.layout.height + panel_height_change;
                                // Next loop through all panels.
                                // Update proportional dimensions for all panels including the one we've resized using discrete heights.
                                // Reposition panels with a greater y-index than this panel to their appropriate new origin.
                                this.parent.panel_ids_by_y_index.forEach(function (loop_panel_id, loop_panel_idx) {
                                    var loop_panel = this.parent.panels[this.parent.panel_ids_by_y_index[loop_panel_idx]];
                                    loop_panel.layout.proportional_height = loop_panel.layout.height / new_calculated_plot_height;
                                    if (loop_panel_idx > panel_idx) {
                                        loop_panel.setOrigin(loop_panel.layout.origin.x, loop_panel.layout.origin.y + panel_height_change);
                                        loop_panel.dashboard.position();
                                    }
                                }.bind(this));
                                // Reset dimensions on the entire plot and reposition panel boundaries
                                this.parent.positionPanels();
                                this.position();
                            }.bind(this));
                            selector.call(panel_resize_drag);
                            this.parent.panel_boundaries.selectors.push(selector);
                        }.bind(this));
                        // Create a corner boundary / resize element on the bottom-most panel that resizes the entire plot
                        var corner_selector = d3.select(this.parent.svg.node().parentNode).insert('div', '.lz-data_layer-tooltip').attr('class', 'lz-panel-corner-boundary').attr('title', 'Resize plot');
                        corner_selector.append('span').attr('class', 'lz-panel-corner-boundary-outer');
                        corner_selector.append('span').attr('class', 'lz-panel-corner-boundary-inner');
                        var corner_drag = d3.behavior.drag();
                        corner_drag.on('dragstart', function () {
                            this.dragging = true;
                        }.bind(this));
                        corner_drag.on('dragend', function () {
                            this.dragging = false;
                        }.bind(this));
                        corner_drag.on('drag', function () {
                            this.setDimensions(this.layout.width + d3.event.dx, this.layout.height + d3.event.dy);
                        }.bind(this.parent));
                        corner_selector.call(corner_drag);
                        this.parent.panel_boundaries.corner_selector = corner_selector;
                    }
                    return this.position();
                },
                position: function () {
                    if (!this.showing) {
                        return this;
                    }
                    // Position panel boundaries
                    var plot_page_origin = this.parent.getPageOrigin();
                    this.selectors.forEach(function (selector, panel_idx) {
                        var panel_page_origin = this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]].getPageOrigin();
                        var left = plot_page_origin.x;
                        var top = panel_page_origin.y + this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]].layout.height - 12;
                        var width = this.parent.layout.width - 1;
                        selector.style({
                            top: top + 'px',
                            left: left + 'px',
                            width: width + 'px'
                        });
                        selector.select('span').style({ width: width + 'px' });
                    }.bind(this));
                    // Position corner selector
                    var corner_padding = 10;
                    var corner_size = 16;
                    this.corner_selector.style({
                        top: plot_page_origin.y + this.parent.layout.height - corner_padding - corner_size + 'px',
                        left: plot_page_origin.x + this.parent.layout.width - corner_padding - corner_size + 'px'
                    });
                    return this;
                },
                hide: function () {
                    if (!this.showing) {
                        return this;
                    }
                    this.showing = false;
                    // Remove panel boundaries
                    this.selectors.forEach(function (selector) {
                        selector.remove();
                    });
                    this.selectors = [];
                    // Remove corner boundary
                    this.corner_selector.remove();
                    this.corner_selector = null;
                    return this;
                }
            };
            // Show panel boundaries stipulated by the layout (basic toggle, only show on mouse over plot)
            if (this.layout.panel_boundaries) {
                d3.select(this.svg.node().parentNode).on('mouseover.' + this.id + '.panel_boundaries', function () {
                    clearTimeout(this.panel_boundaries.hide_timeout);
                    this.panel_boundaries.show();
                }.bind(this));
                d3.select(this.svg.node().parentNode).on('mouseout.' + this.id + '.panel_boundaries', function () {
                    this.panel_boundaries.hide_timeout = setTimeout(function () {
                        this.panel_boundaries.hide();
                    }.bind(this), 300);
                }.bind(this));
            }
            // Create the dashboard object and immediately show it
            this.dashboard = new LocusZoom.Dashboard(this).show();
            // Initialize all panels
            for (var id in this.panels) {
                this.panels[id].initialize();
            }
            // Define plot-level mouse events
            var namespace = '.' + this.id;
            if (this.layout.mouse_guide) {
                var mouseout_mouse_guide = function () {
                    this.mouse_guide.vertical.attr('x', -1);
                    this.mouse_guide.horizontal.attr('y', -1);
                }.bind(this);
                var mousemove_mouse_guide = function () {
                    var coords = d3.mouse(this.svg.node());
                    this.mouse_guide.vertical.attr('x', coords[0]);
                    this.mouse_guide.horizontal.attr('y', coords[1]);
                }.bind(this);
                this.svg.on('mouseout' + namespace + '-mouse_guide', mouseout_mouse_guide).on('touchleave' + namespace + '-mouse_guide', mouseout_mouse_guide).on('mousemove' + namespace + '-mouse_guide', mousemove_mouse_guide);
            }
            var mouseup = function () {
                this.stopDrag();
            }.bind(this);
            var mousemove = function () {
                if (this.interaction.dragging) {
                    var coords = d3.mouse(this.svg.node());
                    if (d3.event) {
                        d3.event.preventDefault();
                    }
                    this.interaction.dragging.dragged_x = coords[0] - this.interaction.dragging.start_x;
                    this.interaction.dragging.dragged_y = coords[1] - this.interaction.dragging.start_y;
                    this.panels[this.interaction.panel_id].render();
                    this.interaction.linked_panel_ids.forEach(function (panel_id) {
                        this.panels[panel_id].render();
                    }.bind(this));
                }
            }.bind(this);
            this.svg.on('mouseup' + namespace, mouseup).on('touchend' + namespace, mouseup).on('mousemove' + namespace, mousemove).on('touchmove' + namespace, mousemove);
            // Add an extra namespaced mouseup handler to the containing body, if there is one
            // This helps to stop interaction events gracefully when dragging outside of the plot element
            if (!d3.select('body').empty()) {
                d3.select('body').on('mouseup' + namespace, mouseup).on('touchend' + namespace, mouseup);
            }
            this.initialized = true;
            // An extra call to setDimensions with existing discrete dimensions fixes some rounding errors with tooltip
            // positioning. TODO: make this additional call unnecessary.
            var client_rect = this.svg.node().getBoundingClientRect();
            var width = client_rect.width ? client_rect.width : this.layout.width;
            var height = client_rect.height ? client_rect.height : this.layout.height;
            this.setDimensions(width, height);
            return this;
        };
        /**
 * Refresh (or fetch) a plot's data from sources, regardless of whether position or state has changed
 * @returns {Promise}
 */
        LocusZoom.Plot.prototype.refresh = function () {
            return this.applyState();
        };
        /**
 * A user-defined callback function that can receive (and potentially act on) new plot data.
 * @callback externalDataCallback
 * @param {Object} new_data The body resulting from a data request. This represents the same information that would be passed to
 *  a data layer making an equivalent request.
 */
        /**
 * A user-defined callback function that can respond to errors received during a previous operation
 * @callback externalErrorCallback
 * @param err A representation of the error that occurred
 */
        /**
 * Allow newly fetched data to be made available outside the LocusZoom plot. For example, a callback could be
 *  registered to draw an HTML table of top GWAS hits, and update that table whenever the plot region changes.
 *
 * This is a convenience method for external hooks. It registers an event listener and returns parsed data,
 *  using the same fields syntax and underlying methods as data layers.
 *
 * @param {String[]} fields An array of field names and transforms, in the same syntax used by a data layer.
 *  Different data sources should be prefixed by the source name.
 * @param {externalDataCallback} success_callback Used defined function that is automatically called any time that
 *  new data is received by the plot.
 * @param {Object} [opts] Options
 * @param {externalErrorCallback} [opts.onerror] User defined function that is automatically called if a problem
 *  occurs during the data request or subsequent callback operations
 * @param {boolean} [opts.discrete=false] Normally the callback will subscribe to the combined body from the chain,
 *  which may not be in a format that matches what the external callback wants to do. If discrete=true, returns the
 *  uncombined record info
 *  @return {function} The newly created event listener, to allow for later cleanup/removal
 */
        LocusZoom.Plot.prototype.subscribeToData = function (fields, success_callback, opts) {
            opts = opts || {};
            // Register an event listener that is notified whenever new data has been rendered
            var error_callback = opts.onerror || function (err) {
                console.log('An error occurred while acting on an external callback', err);
            };
            var self = this;
            var listener = function () {
                try {
                    self.lzd.getData(self.state, fields).then(function (new_data) {
                        success_callback(opts.discrete ? new_data.discrete : new_data.body);
                    }).catch(error_callback);
                } catch (error) {
                    // In certain cases, errors are thrown before a promise can be generated, and LZ error display seems to rely on these errors bubbling up
                    error_callback(error);
                }
            };
            this.on('data_rendered', listener);
            return listener;
        };
        /**
 * Update state values and trigger a pull for fresh data on all data sources for all data layers
 * @param state_changes
 * @returns {Promise} A promise that resolves when all data fetch and update operations are complete
 */
        LocusZoom.Plot.prototype.applyState = function (state_changes) {
            state_changes = state_changes || {};
            if (typeof state_changes != 'object') {
                throw 'LocusZoom.applyState only accepts an object; ' + typeof state_changes + ' given';
            }
            // First make a copy of the current (old) state to work with
            var new_state = JSON.parse(JSON.stringify(this.state));
            // Apply changes by top-level property to the new state
            for (var property in state_changes) {
                new_state[property] = state_changes[property];
            }
            // Validate the new state (may do nothing, may do a lot, depends on how the user has things set up)
            new_state = LocusZoom.validateState(new_state, this.layout);
            // Apply new state to the actual state
            for (property in new_state) {
                this.state[property] = new_state[property];
            }
            // Generate requests for all panels given new state
            this.emit('data_requested');
            this.remap_promises = [];
            this.loading_data = true;
            for (var id in this.panels) {
                this.remap_promises.push(this.panels[id].reMap());
            }
            return Q.all(this.remap_promises).catch(function (error) {
                console.error(error);
                this.curtain.drop(error);
                this.loading_data = false;
            }.bind(this)).then(function () {
                // TODO: Check logic here; in some promise implementations, this would cause the error to be considered handled, and "then" would always fire. (may or may not be desired behavior)
                // Update dashboard / components
                this.dashboard.update();
                // Apply panel-level state values
                this.panel_ids_by_y_index.forEach(function (panel_id) {
                    var panel = this.panels[panel_id];
                    panel.dashboard.update();
                    // Apply data-layer-level state values
                    panel.data_layer_ids_by_z_index.forEach(function (data_layer_id) {
                        var data_layer = this.data_layers[data_layer_id];
                        var state_id = panel_id + '.' + data_layer_id;
                        for (var property in this.state[state_id]) {
                            if (!this.state[state_id].hasOwnProperty(property)) {
                                continue;
                            }
                            if (Array.isArray(this.state[state_id][property])) {
                                this.state[state_id][property].forEach(function (element_id) {
                                    try {
                                        this.setElementStatus(property, this.getElementById(element_id), true);
                                    } catch (e) {
                                        console.error('Unable to apply state: ' + state_id + ', ' + property);
                                    }
                                }.bind(data_layer));
                            }
                        }
                    }.bind(panel));
                }.bind(this));
                // Emit events
                this.emit('layout_changed');
                this.emit('data_rendered');
                this.emit('state_changed', state_changes);
                this.loading_data = false;
            }.bind(this));
        };
        /**
 * Register interactions along the specified axis, provided that the target panel allows interaction.
 *
 * @param {LocusZoom.Panel} panel
 * @param {('x_tick'|'y1_tick'|'y2_tick')} method The direction (axis) along which dragging is being performed.
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.startDrag = function (panel, method) {
            panel = panel || null;
            method = method || null;
            var axis = null;
            switch (method) {
            case 'background':
            case 'x_tick':
                axis = 'x';
                break;
            case 'y1_tick':
                axis = 'y1';
                break;
            case 'y2_tick':
                axis = 'y2';
                break;
            }
            if (!(panel instanceof LocusZoom.Panel) || !axis || !this.canInteract()) {
                return this.stopDrag();
            }
            var coords = d3.mouse(this.svg.node());
            this.interaction = {
                panel_id: panel.id,
                linked_panel_ids: panel.getLinkedPanelIds(axis),
                dragging: {
                    method: method,
                    start_x: coords[0],
                    start_y: coords[1],
                    dragged_x: 0,
                    dragged_y: 0,
                    axis: axis
                }
            };
            this.svg.style('cursor', 'all-scroll');
            return this;
        };
        /**
 * Process drag interactions across the target panel and synchronize plot state across other panels in sync;
 *   clear the event when complete
 * @returns {LocusZoom.Plot}
 */
        LocusZoom.Plot.prototype.stopDrag = function () {
            if (!this.interaction.dragging) {
                return this;
            }
            if (typeof this.panels[this.interaction.panel_id] != 'object') {
                this.interaction = {};
                return this;
            }
            var panel = this.panels[this.interaction.panel_id];
            // Helper function to find the appropriate axis layouts on child data layers
            // Once found, apply the extent as floor/ceiling and remove all other directives
            // This forces all associated axes to conform to the extent generated by a drag action
            var overrideAxisLayout = function (axis, axis_number, extent) {
                panel.data_layer_ids_by_z_index.forEach(function (id) {
                    if (panel.data_layers[id].layout[axis + '_axis'].axis === axis_number) {
                        panel.data_layers[id].layout[axis + '_axis'].floor = extent[0];
                        panel.data_layers[id].layout[axis + '_axis'].ceiling = extent[1];
                        delete panel.data_layers[id].layout[axis + '_axis'].lower_buffer;
                        delete panel.data_layers[id].layout[axis + '_axis'].upper_buffer;
                        delete panel.data_layers[id].layout[axis + '_axis'].min_extent;
                        delete panel.data_layers[id].layout[axis + '_axis'].ticks;
                    }
                });
            };
            switch (this.interaction.dragging.method) {
            case 'background':
            case 'x_tick':
                if (this.interaction.dragging.dragged_x !== 0) {
                    overrideAxisLayout('x', 1, panel.x_extent);
                    this.applyState({
                        start: panel.x_extent[0],
                        end: panel.x_extent[1]
                    });
                }
                break;
            case 'y1_tick':
            case 'y2_tick':
                if (this.interaction.dragging.dragged_y !== 0) {
                    // TODO: Hardcoded assumption of only two possible axes with single-digit #s (switch/case)
                    var y_axis_number = parseInt(this.interaction.dragging.method[1]);
                    overrideAxisLayout('y', y_axis_number, panel['y' + y_axis_number + '_extent']);
                }
                break;
            }
            this.interaction = {};
            this.svg.style('cursor', null);
            return this;
        };
        /* global LocusZoom */
        'use strict';
        /**
 * A panel is an abstract class representing a subdivision of the LocusZoom stage
 *   to display a distinct data representation as a collection of data layers.
 * @class
 * @param {Object} layout
 * @param {LocusZoom.Plot|null} parent
*/
        LocusZoom.Panel = function (layout, parent) {
            if (typeof layout !== 'object') {
                throw 'Unable to create panel, invalid layout';
            }
            /** @member {LocusZoom.Plot|null} */
            this.parent = parent || null;
            /** @member {LocusZoom.Plot|null} */
            this.parent_plot = parent;
            // Ensure a valid ID is present. If there is no valid ID then generate one
            if (typeof layout.id !== 'string' || !layout.id.length) {
                if (!this.parent) {
                    layout.id = 'p' + Math.floor(Math.random() * Math.pow(10, 8));
                } else {
                    var id = null;
                    var generateID = function () {
                        id = 'p' + Math.floor(Math.random() * Math.pow(10, 8));
                        if (id == null || typeof this.parent.panels[id] != 'undefined') {
                            id = generateID();
                        }
                    }.bind(this);
                    layout.id = id;
                }
            } else if (this.parent) {
                if (typeof this.parent.panels[layout.id] !== 'undefined') {
                    throw 'Cannot create panel with id [' + layout.id + ']; panel with that id already exists';
                }
            }
            /** @member {String} */
            this.id = layout.id;
            /** @member {Boolean} */
            this.initialized = false;
            /**
     * The index of this panel in the parent plot's `layout.panels`
     * @member {number}
     * */
            this.layout_idx = null;
            /** @member {Object} */
            this.svg = {};
            /**
     * A JSON-serializable object used to describe the composition of the Panel
     * @member {Object}
     */
            this.layout = LocusZoom.Layouts.merge(layout || {}, LocusZoom.Panel.DefaultLayout);
            // Define state parameters specific to this panel
            if (this.parent) {
                /** @member {Object} */
                this.state = this.parent.state;
                /** @member {String} */
                this.state_id = this.id;
                this.state[this.state_id] = this.state[this.state_id] || {};
            } else {
                this.state = null;
                this.state_id = null;
            }
            /** @member {Object} */
            this.data_layers = {};
            /** @member {String[]} */
            this.data_layer_ids_by_z_index = [];
            /** @protected */
            this.applyDataLayerZIndexesToDataLayerLayouts = function () {
                this.data_layer_ids_by_z_index.forEach(function (dlid, idx) {
                    this.data_layers[dlid].layout.z_index = idx;
                }.bind(this));
            }.bind(this);
            /**
     * Track data requests in progress
     * @member {Promise[]}
     *  @protected
     */
            this.data_promises = [];
            /** @member {d3.scale} */
            this.x_scale = null;
            /** @member {d3.scale} */
            this.y1_scale = null;
            /** @member {d3.scale} */
            this.y2_scale = null;
            /** @member {d3.extent} */
            this.x_extent = null;
            /** @member {d3.extent} */
            this.y1_extent = null;
            /** @member {d3.extent} */
            this.y2_extent = null;
            /** @member {Number[]} */
            this.x_ticks = [];
            /** @member {Number[]} */
            this.y1_ticks = [];
            /** @member {Number[]} */
            this.y2_ticks = [];
            /**
     * A timeout ID as returned by setTimeout
     * @protected
     * @member {number}
     */
            this.zoom_timeout = null;
            /** @returns {string} */
            this.getBaseId = function () {
                return this.parent.id + '.' + this.id;
            };
            /**
     * Known event hooks that the panel can respond to
     * @protected
     * @member {Object}
     */
            this.event_hooks = {
                'layout_changed': [],
                'data_requested': [],
                'data_rendered': [],
                'element_clicked': [],
                'element_selection': []
            };
            /**
     * There are several events that a LocusZoom panel can "emit" when appropriate, and LocusZoom supports registering
     *   "hooks" for these events which are essentially custom functions intended to fire at certain times.
     *
     * The following panel-level events are currently supported:
     *   - `layout_changed` - context: panel - Any aspect of the panel's layout (including dimensions or state) has changed.
     *   - `data_requested` - context: panel - A request for new data from any data source used in the panel has been made.
     *   - `data_rendered` - context: panel - Data from a request has been received and rendered in the panel.
     *   - `element_clicked` - context: panel - A data element in any of the panel's data layers has been clicked.
     *   - `element_selection` - context: panel - Triggered when an element changes "selection" status, and identifies
     *        whether the element is being selected or deselected.
     *
     * To register a hook for any of these events use `panel.on('event_name', function() {})`.
     *
     * There can be arbitrarily many functions registered to the same event. They will be executed in the order they
     *   were registered. The this context bound to each event hook function is dependent on the type of event, as
     *   denoted above. For example, when data_requested is emitted the context for this in the event hook will be the
     *   panel itself, but when element_clicked is emitted the context for this in the event hook will be the element
     *   that was clicked.
     *
     * @param {String} event The name of the event (as defined in `event_hooks`)
     * @param {function} hook
     * @returns {function} The registered event listener
     */
            this.on = function (event, hook) {
                // TODO: Dry plot and panel event code into a shared mixin
                if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
                    throw 'Unable to register event hook, invalid event: ' + event.toString();
                }
                if (typeof hook != 'function') {
                    throw 'Unable to register event hook, invalid hook function passed';
                }
                this.event_hooks[event].push(hook);
                return hook;
            };
            /**
     * Remove one or more previously defined event listeners
     * @param {String} event The name of an event (as defined in `event_hooks`)
     * @param {eventCallback} [hook] The callback to deregister
     * @returns {LocusZoom.Panel}
     */
            this.off = function (event, hook) {
                var theseHooks = this.event_hooks[event];
                if (typeof 'event' != 'string' || !Array.isArray(theseHooks)) {
                    throw 'Unable to remove event hook, invalid event: ' + event.toString();
                }
                if (hook === undefined) {
                    // Deregistering all hooks for this event may break basic functionality, and should only be used during
                    //  cleanup operations (eg to prevent memory leaks)
                    this.event_hooks[event] = [];
                } else {
                    var hookMatch = theseHooks.indexOf(hook);
                    if (hookMatch !== -1) {
                        theseHooks.splice(hookMatch, 1);
                    } else {
                        throw 'The specified event listener is not registered and therefore cannot be removed';
                    }
                }
                return this;
            };
            /**
     * Handle running of event hooks when an event is emitted
     *
     * There is a shorter overloaded form of this method: if the event does not have any data, the second
     *   argument can be a boolean to control bubbling
     *
     * @param {string} event A known event name
     * @param {*} [eventData] Data or event description that will be passed to the event listener
     * @param {boolean} [bubble=false] Whether to bubble the event to the parent
     * @returns {LocusZoom.Panel}
     */
            this.emit = function (event, eventData, bubble) {
                bubble = bubble || false;
                // TODO: DRY this with the parent plot implementation. Ensure interfaces remain compatible.
                // TODO: Improve documentation for overloaded method signature (JSDoc may have trouble here)
                if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
                    throw 'LocusZoom attempted to throw an invalid event: ' + event.toString();
                }
                if (typeof eventData === 'boolean' && arguments.length === 2) {
                    // Overloaded method signature: emit(event, bubble)
                    bubble = eventData;
                    eventData = null;
                }
                var sourceID = this.getBaseId();
                var self = this;
                var eventContext = {
                    sourceID: sourceID,
                    data: eventData || null
                };
                this.event_hooks[event].forEach(function (hookToRun) {
                    // By default, any handlers fired here will see the panel as the value of `this`. If a bound function is
                    // registered as a handler, the previously bound `this` will override anything provided to `call` below.
                    hookToRun.call(self, eventContext);
                });
                if (bubble && this.parent) {
                    this.parent.emit(event, eventContext);
                }
                return this;
            };
            /**
     * Get an object with the x and y coordinates of the panel's origin in terms of the entire page
     * Necessary for positioning any HTML elements over the panel
     * @returns {{x: Number, y: Number}}
     */
            this.getPageOrigin = function () {
                var plot_origin = this.parent.getPageOrigin();
                return {
                    x: plot_origin.x + this.layout.origin.x,
                    y: plot_origin.y + this.layout.origin.y
                };
            };
            // Initialize the layout
            this.initializeLayout();
            return this;
        };
        /**
 * Default panel layout
 * @static
 * @type {Object}
 */
        LocusZoom.Panel.DefaultLayout = {
            title: {
                text: '',
                style: {},
                x: 10,
                y: 22
            },
            y_index: null,
            width: 0,
            height: 0,
            origin: {
                x: 0,
                y: null
            },
            min_width: 1,
            min_height: 1,
            proportional_width: null,
            proportional_height: null,
            proportional_origin: {
                x: 0,
                y: null
            },
            margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            },
            background_click: 'clear_selections',
            dashboard: { components: [] },
            cliparea: {
                height: 0,
                width: 0,
                origin: {
                    x: 0,
                    y: 0
                }
            },
            axes: {
                // These are the only axes supported!!
                x: {},
                y1: {},
                y2: {}
            },
            legend: null,
            interaction: {
                drag_background_to_pan: false,
                drag_x_ticks_to_scale: false,
                drag_y1_ticks_to_scale: false,
                drag_y2_ticks_to_scale: false,
                scroll_to_zoom: false,
                x_linked: false,
                y1_linked: false,
                y2_linked: false
            },
            data_layers: []
        };
        /**
 * Prepare the panel for first use by performing parameter validation, creating axes, setting default dimensions,
 *   and preparing / positioning data layers as appropriate.
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.initializeLayout = function () {
            // If the layout is missing BOTH width and proportional width then set the proportional width to 1.
            // This will default the panel to taking up the full width of the plot.
            if (this.layout.width === 0 && this.layout.proportional_width === null) {
                this.layout.proportional_width = 1;
            }
            // If the layout is missing BOTH height and proportional height then set the proportional height to
            // an equal share of the plot's current height.
            if (this.layout.height === 0 && this.layout.proportional_height === null) {
                var panel_count = Object.keys(this.parent.panels).length;
                if (panel_count > 0) {
                    this.layout.proportional_height = 1 / panel_count;
                } else {
                    this.layout.proportional_height = 1;
                }
            }
            // Set panel dimensions, origin, and margin
            this.setDimensions();
            this.setOrigin();
            this.setMargin();
            // Set ranges
            // TODO: Define stub values in constructor
            this.x_range = [
                0,
                this.layout.cliparea.width
            ];
            this.y1_range = [
                this.layout.cliparea.height,
                0
            ];
            this.y2_range = [
                this.layout.cliparea.height,
                0
            ];
            // Initialize panel axes
            [
                'x',
                'y1',
                'y2'
            ].forEach(function (axis) {
                if (!Object.keys(this.layout.axes[axis]).length || this.layout.axes[axis].render === false) {
                    // The default layout sets the axis to an empty object, so set its render boolean here
                    this.layout.axes[axis].render = false;
                } else {
                    this.layout.axes[axis].render = true;
                    this.layout.axes[axis].label = this.layout.axes[axis].label || null;
                    this.layout.axes[axis].label_function = this.layout.axes[axis].label_function || null;
                }
            }.bind(this));
            // Add data layers (which define x and y extents)
            this.layout.data_layers.forEach(function (data_layer_layout) {
                this.addDataLayer(data_layer_layout);
            }.bind(this));
            return this;
        };
        /**
 * Set the dimensions for the panel. If passed with no arguments will calculate optimal size based on layout
 *   directives and the available area within the plot. If passed discrete width (number) and height (number) will
 *   attempt to resize the panel to them, but may be limited by minimum dimensions defined on the plot or panel.
 *
 * @public
 * @param {number} [width]
 * @param {number} [height]
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.setDimensions = function (width, height) {
            if (typeof width != 'undefined' && typeof height != 'undefined') {
                if (!isNaN(width) && width >= 0 && !isNaN(height) && height >= 0) {
                    this.layout.width = Math.max(Math.round(+width), this.layout.min_width);
                    this.layout.height = Math.max(Math.round(+height), this.layout.min_height);
                }
            } else {
                if (this.layout.proportional_width !== null) {
                    this.layout.width = Math.max(this.layout.proportional_width * this.parent.layout.width, this.layout.min_width);
                }
                if (this.layout.proportional_height !== null) {
                    this.layout.height = Math.max(this.layout.proportional_height * this.parent.layout.height, this.layout.min_height);
                }
            }
            this.layout.cliparea.width = Math.max(this.layout.width - (this.layout.margin.left + this.layout.margin.right), 0);
            this.layout.cliparea.height = Math.max(this.layout.height - (this.layout.margin.top + this.layout.margin.bottom), 0);
            if (this.svg.clipRect) {
                this.svg.clipRect.attr('width', this.layout.width).attr('height', this.layout.height);
            }
            if (this.initialized) {
                this.render();
                this.curtain.update();
                this.loader.update();
                this.dashboard.update();
                if (this.legend) {
                    this.legend.position();
                }
            }
            return this;
        };
        /**
 * Set panel origin on the plot, and re-render as appropriate
 *
 * @public
 * @param {number} x
 * @param {number} y
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.setOrigin = function (x, y) {
            if (!isNaN(x) && x >= 0) {
                this.layout.origin.x = Math.max(Math.round(+x), 0);
            }
            if (!isNaN(y) && y >= 0) {
                this.layout.origin.y = Math.max(Math.round(+y), 0);
            }
            if (this.initialized) {
                this.render();
            }
            return this;
        };
        /**
 * Set margins around this panel
 * @public
 * @param {number} top
 * @param {number} right
 * @param {number} bottom
 * @param {number} left
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.setMargin = function (top, right, bottom, left) {
            var extra;
            if (!isNaN(top) && top >= 0) {
                this.layout.margin.top = Math.max(Math.round(+top), 0);
            }
            if (!isNaN(right) && right >= 0) {
                this.layout.margin.right = Math.max(Math.round(+right), 0);
            }
            if (!isNaN(bottom) && bottom >= 0) {
                this.layout.margin.bottom = Math.max(Math.round(+bottom), 0);
            }
            if (!isNaN(left) && left >= 0) {
                this.layout.margin.left = Math.max(Math.round(+left), 0);
            }
            if (this.layout.margin.top + this.layout.margin.bottom > this.layout.height) {
                extra = Math.floor((this.layout.margin.top + this.layout.margin.bottom - this.layout.height) / 2);
                this.layout.margin.top -= extra;
                this.layout.margin.bottom -= extra;
            }
            if (this.layout.margin.left + this.layout.margin.right > this.layout.width) {
                extra = Math.floor((this.layout.margin.left + this.layout.margin.right - this.layout.width) / 2);
                this.layout.margin.left -= extra;
                this.layout.margin.right -= extra;
            }
            [
                'top',
                'right',
                'bottom',
                'left'
            ].forEach(function (m) {
                this.layout.margin[m] = Math.max(this.layout.margin[m], 0);
            }.bind(this));
            this.layout.cliparea.width = Math.max(this.layout.width - (this.layout.margin.left + this.layout.margin.right), 0);
            this.layout.cliparea.height = Math.max(this.layout.height - (this.layout.margin.top + this.layout.margin.bottom), 0);
            this.layout.cliparea.origin.x = this.layout.margin.left;
            this.layout.cliparea.origin.y = this.layout.margin.top;
            if (this.initialized) {
                this.render();
            }
            return this;
        };
        /**
 * Set the title for the panel. If passed an object, will merge the object with the existing layout configuration, so
 *   that all or only some of the title layout object's parameters can be customized. If passed null, false, or an empty
 *   string, the title DOM element will be set to display: none.
 *
 * @param {string|object|null} title The title text, or an object with additional configuration
 * @param {string} title.text Text to display. Since titles are rendered as SVG text, HTML and newlines will not be rendered.
 * @param {number} title.x X-offset, in pixels, for the title's text anchor (default left) relative to the top-left corner of the panel.
 * @param {number} title.y Y-offset, in pixels, for the title's text anchor (default left) relative to the top-left corner of the panel.
    NOTE: SVG y values go from the top down, so the SVG origin of (0,0) is in the top left corner.
 * @param {object} title.style CSS styles object to be applied to the title's DOM element.
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.setTitle = function (title) {
            if (typeof this.layout.title == 'string') {
                var text = this.layout.title;
                this.layout.title = {
                    text: text,
                    x: 0,
                    y: 0,
                    style: {}
                };
            }
            if (typeof title == 'string') {
                this.layout.title.text = title;
            } else if (typeof title == 'object' && title !== null) {
                this.layout.title = LocusZoom.Layouts.merge(title, this.layout.title);
            }
            if (this.layout.title.text.length) {
                this.title.attr('display', null).attr('x', parseFloat(this.layout.title.x)).attr('y', parseFloat(this.layout.title.y)).style(this.layout.title.style).text(this.layout.title.text);
            } else {
                this.title.attr('display', 'none');
            }
            return this;
        };
        /**
 * Prepare the first rendering of the panel. This includes drawing the individual data layers, but also creates shared
 *   elements such as axes,  title, and loader/curtain.
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.initialize = function () {
            // Append a container group element to house the main panel group element and the clip path
            // Position with initial layout parameters
            this.svg.container = this.parent.svg.append('g').attr('id', this.getBaseId() + '.panel_container').attr('transform', 'translate(' + (this.layout.origin.x || 0) + ',' + (this.layout.origin.y || 0) + ')');
            // Append clip path to the parent svg element, size with initial layout parameters
            var clipPath = this.svg.container.append('clipPath').attr('id', this.getBaseId() + '.clip');
            this.svg.clipRect = clipPath.append('rect').attr('width', this.layout.width).attr('height', this.layout.height);
            // Append svg group for rendering all panel child elements, clipped by the clip path
            this.svg.group = this.svg.container.append('g').attr('id', this.getBaseId() + '.panel').attr('clip-path', 'url(#' + this.getBaseId() + '.clip)');
            // Add curtain and loader prototypes to the panel
            /** @member {Object} */
            this.curtain = LocusZoom.generateCurtain.call(this);
            /** @member {Object} */
            this.loader = LocusZoom.generateLoader.call(this);
            /**
     * Create the dashboard object and hang components on it as defined by panel layout
     * @member {LocusZoom.Dashboard}
     */
            this.dashboard = new LocusZoom.Dashboard(this);
            // Inner border
            this.inner_border = this.svg.group.append('rect').attr('class', 'lz-panel-background').on('click', function () {
                if (this.layout.background_click === 'clear_selections') {
                    this.clearSelections();
                }
            }.bind(this));
            // Add the title
            /** @member {Element} */
            this.title = this.svg.group.append('text').attr('class', 'lz-panel-title');
            if (typeof this.layout.title != 'undefined') {
                this.setTitle();
            }
            // Initialize Axes
            this.svg.x_axis = this.svg.group.append('g').attr('id', this.getBaseId() + '.x_axis').attr('class', 'lz-x lz-axis');
            if (this.layout.axes.x.render) {
                this.svg.x_axis_label = this.svg.x_axis.append('text').attr('class', 'lz-x lz-axis lz-label').attr('text-anchor', 'middle');
            }
            this.svg.y1_axis = this.svg.group.append('g').attr('id', this.getBaseId() + '.y1_axis').attr('class', 'lz-y lz-y1 lz-axis');
            if (this.layout.axes.y1.render) {
                this.svg.y1_axis_label = this.svg.y1_axis.append('text').attr('class', 'lz-y1 lz-axis lz-label').attr('text-anchor', 'middle');
            }
            this.svg.y2_axis = this.svg.group.append('g').attr('id', this.getBaseId() + '.y2_axis').attr('class', 'lz-y lz-y2 lz-axis');
            if (this.layout.axes.y2.render) {
                this.svg.y2_axis_label = this.svg.y2_axis.append('text').attr('class', 'lz-y2 lz-axis lz-label').attr('text-anchor', 'middle');
            }
            // Initialize child Data Layers
            this.data_layer_ids_by_z_index.forEach(function (id) {
                this.data_layers[id].initialize();
            }.bind(this));
            /**
     * Legend object, as defined by panel layout and child data layer layouts
     * @member {LocusZoom.Legend}
     * */
            this.legend = null;
            if (this.layout.legend) {
                this.legend = new LocusZoom.Legend(this);
            }
            // Establish panel background drag interaction mousedown event handler (on the panel background)
            if (this.layout.interaction.drag_background_to_pan) {
                var namespace = '.' + this.parent.id + '.' + this.id + '.interaction.drag';
                var mousedown = function () {
                    this.parent.startDrag(this, 'background');
                }.bind(this);
                this.svg.container.select('.lz-panel-background').on('mousedown' + namespace + '.background', mousedown).on('touchstart' + namespace + '.background', mousedown);
            }
            return this;
        };
        /**
 * Refresh the sort order of all data layers (called by data layer moveUp and moveDown methods)
 */
        LocusZoom.Panel.prototype.resortDataLayers = function () {
            var sort = [];
            this.data_layer_ids_by_z_index.forEach(function (id) {
                sort.push(this.data_layers[id].layout.z_index);
            }.bind(this));
            this.svg.group.selectAll('g.lz-data_layer-container').data(sort).sort(d3.ascending);
            this.applyDataLayerZIndexesToDataLayerLayouts();
        };
        /**
 * Get an array of panel IDs that are axis-linked to this panel
 * @param {('x'|'y1'|'y2')} axis
 * @returns {Array}
 */
        LocusZoom.Panel.prototype.getLinkedPanelIds = function (axis) {
            axis = axis || null;
            var linked_panel_ids = [];
            if ([
                    'x',
                    'y1',
                    'y2'
                ].indexOf(axis) === -1) {
                return linked_panel_ids;
            }
            if (!this.layout.interaction[axis + '_linked']) {
                return linked_panel_ids;
            }
            this.parent.panel_ids_by_y_index.forEach(function (panel_id) {
                if (panel_id !== this.id && this.parent.panels[panel_id].layout.interaction[axis + '_linked']) {
                    linked_panel_ids.push(panel_id);
                }
            }.bind(this));
            return linked_panel_ids;
        };
        /**
 * Move a panel up relative to others by y-index
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.moveUp = function () {
            if (this.parent.panel_ids_by_y_index[this.layout.y_index - 1]) {
                this.parent.panel_ids_by_y_index[this.layout.y_index] = this.parent.panel_ids_by_y_index[this.layout.y_index - 1];
                this.parent.panel_ids_by_y_index[this.layout.y_index - 1] = this.id;
                this.parent.applyPanelYIndexesToPanelLayouts();
                this.parent.positionPanels();
            }
            return this;
        };
        /**
 * Move a panel down (y-axis) relative to others in the plot
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.moveDown = function () {
            if (this.parent.panel_ids_by_y_index[this.layout.y_index + 1]) {
                this.parent.panel_ids_by_y_index[this.layout.y_index] = this.parent.panel_ids_by_y_index[this.layout.y_index + 1];
                this.parent.panel_ids_by_y_index[this.layout.y_index + 1] = this.id;
                this.parent.applyPanelYIndexesToPanelLayouts();
                this.parent.positionPanels();
            }
            return this;
        };
        /**
 * Create a new data layer from a provided layout object. Should have the keys specified in `DefaultLayout`
 * Will automatically add at the top (depth/z-index) of the panel unless explicitly directed differently
 *   in the layout provided.
 * @param {object} layout
 * @returns {*}
 */
        LocusZoom.Panel.prototype.addDataLayer = function (layout) {
            // Sanity checks
            if (typeof layout !== 'object' || typeof layout.id !== 'string' || !layout.id.length) {
                throw 'Invalid data layer layout passed to LocusZoom.Panel.prototype.addDataLayer()';
            }
            if (typeof this.data_layers[layout.id] !== 'undefined') {
                throw 'Cannot create data_layer with id [' + layout.id + ']; data layer with that id already exists in the panel';
            }
            if (typeof layout.type !== 'string') {
                throw 'Invalid data layer type in layout passed to LocusZoom.Panel.prototype.addDataLayer()';
            }
            // If the layout defines a y axis make sure the axis number is set and is 1 or 2 (default to 1)
            if (typeof layout.y_axis == 'object' && (typeof layout.y_axis.axis == 'undefined' || [
                    1,
                    2
                ].indexOf(layout.y_axis.axis) === -1)) {
                layout.y_axis.axis = 1;
            }
            // Create the Data Layer
            var data_layer = LocusZoom.DataLayers.get(layout.type, layout, this);
            // Store the Data Layer on the Panel
            this.data_layers[data_layer.id] = data_layer;
            // If a discrete z_index was set in the layout then adjust other data layer z_index values to accommodate this one
            if (data_layer.layout.z_index !== null && !isNaN(data_layer.layout.z_index) && this.data_layer_ids_by_z_index.length > 0) {
                // Negative z_index values should count backwards from the end, so convert negatives to appropriate values here
                if (data_layer.layout.z_index < 0) {
                    data_layer.layout.z_index = Math.max(this.data_layer_ids_by_z_index.length + data_layer.layout.z_index, 0);
                }
                this.data_layer_ids_by_z_index.splice(data_layer.layout.z_index, 0, data_layer.id);
                this.data_layer_ids_by_z_index.forEach(function (dlid, idx) {
                    this.data_layers[dlid].layout.z_index = idx;
                }.bind(this));
            } else {
                var length = this.data_layer_ids_by_z_index.push(data_layer.id);
                this.data_layers[data_layer.id].layout.z_index = length - 1;
            }
            // Determine if this data layer was already in the layout.data_layers array.
            // If it wasn't, add it. Either way store the layout.data_layers array index on the data_layer.
            var layout_idx = null;
            this.layout.data_layers.forEach(function (data_layer_layout, idx) {
                if (data_layer_layout.id === data_layer.id) {
                    layout_idx = idx;
                }
            });
            if (layout_idx === null) {
                layout_idx = this.layout.data_layers.push(this.data_layers[data_layer.id].layout) - 1;
            }
            this.data_layers[data_layer.id].layout_idx = layout_idx;
            return this.data_layers[data_layer.id];
        };
        /**
 * Remove a data layer by id
 * @param {string} id
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.removeDataLayer = function (id) {
            if (!this.data_layers[id]) {
                throw 'Unable to remove data layer, ID not found: ' + id;
            }
            // Destroy all tooltips for the data layer
            this.data_layers[id].destroyAllTooltips();
            // Remove the svg container for the data layer if it exists
            if (this.data_layers[id].svg.container) {
                this.data_layers[id].svg.container.remove();
            }
            // Delete the data layer and its presence in the panel layout and state
            this.layout.data_layers.splice(this.data_layers[id].layout_idx, 1);
            delete this.state[this.data_layers[id].state_id];
            delete this.data_layers[id];
            // Remove the data_layer id from the z_index array
            this.data_layer_ids_by_z_index.splice(this.data_layer_ids_by_z_index.indexOf(id), 1);
            // Update layout_idx and layout.z_index values for all remaining data_layers
            this.applyDataLayerZIndexesToDataLayerLayouts();
            this.layout.data_layers.forEach(function (data_layer_layout, idx) {
                this.data_layers[data_layer_layout.id].layout_idx = idx;
            }.bind(this));
            return this;
        };
        /**
 * Clear all selections on all data layers
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.clearSelections = function () {
            this.data_layer_ids_by_z_index.forEach(function (id) {
                this.data_layers[id].setAllElementStatus('selected', false);
            }.bind(this));
            return this;
        };
        /**
 * When the parent plot changes state, adjust the panel accordingly. For example, this may include fetching new data
 *   from the API as the viewing region changes
 * @returns {Promise}
 */
        LocusZoom.Panel.prototype.reMap = function () {
            this.emit('data_requested');
            this.data_promises = [];
            // Remove any previous error messages before attempting to load new data
            this.curtain.hide();
            // Trigger reMap on each Data Layer
            for (var id in this.data_layers) {
                try {
                    this.data_promises.push(this.data_layers[id].reMap());
                } catch (error) {
                    console.warn(error);
                    this.curtain.show(error);
                }
            }
            // When all finished trigger a render
            return Q.all(this.data_promises).then(function () {
                this.initialized = true;
                this.render();
                this.emit('layout_changed', true);
                this.emit('data_rendered');
            }.bind(this)).catch(function (error) {
                console.warn(error);
                this.curtain.show(error);
            }.bind(this));
        };
        /**
 * Iterate over data layers to generate panel axis extents
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.generateExtents = function () {
            // Reset extents
            [
                'x',
                'y1',
                'y2'
            ].forEach(function (axis) {
                this[axis + '_extent'] = null;
            }.bind(this));
            // Loop through the data layers
            for (var id in this.data_layers) {
                var data_layer = this.data_layers[id];
                // If defined and not decoupled, merge the x extent of the data layer with the panel's x extent
                if (data_layer.layout.x_axis && !data_layer.layout.x_axis.decoupled) {
                    this.x_extent = d3.extent((this.x_extent || []).concat(data_layer.getAxisExtent('x')));
                }
                // If defined and not decoupled, merge the y extent of the data layer with the panel's appropriate y extent
                if (data_layer.layout.y_axis && !data_layer.layout.y_axis.decoupled) {
                    var y_axis = 'y' + data_layer.layout.y_axis.axis;
                    this[y_axis + '_extent'] = d3.extent((this[y_axis + '_extent'] || []).concat(data_layer.getAxisExtent('y')));
                }
            }
            // Override x_extent from state if explicitly defined to do so
            if (this.layout.axes.x && this.layout.axes.x.extent === 'state') {
                this.x_extent = [
                    this.state.start,
                    this.state.end
                ];
            }
            return this;
        };
        /**
 * Generate an array of ticks for an axis. These ticks are generated in one of three ways (highest wins):
 *   1. An array of specific tick marks
 *   2. Query each data layer for what ticks are appropriate, and allow a panel-level tick configuration parameter
 *     object to override the layer's default presentation settings
 *   3. Generate generic tick marks based on the extent of the data
 * @param {('x'|'y1'|'y2')} axis The string identifier of the axis
 * @returns {Number[]|Object[]}  TODO: number format?
 *   An array of numbers: interpreted as an array of axis value offsets for positioning.
 *   An array of objects: each object must have an 'x' attribute to position the tick.
 *   Other supported object keys:
 *     * text: string to render for a given tick
 *     * style: d3-compatible CSS style object
 *     * transform: SVG transform attribute string
 *     * color: string or LocusZoom scalable parameter object
 */
        LocusZoom.Panel.prototype.generateTicks = function (axis) {
            // Parse an explicit 'ticks' attribute in the axis layout
            if (this.layout.axes[axis].ticks) {
                var layout = this.layout.axes[axis];
                var baseTickConfig = layout.ticks;
                if (Array.isArray(baseTickConfig)) {
                    // Array of specific ticks hard-coded into a panel will override any ticks that an individual layer might specify
                    return baseTickConfig;
                }
                if (typeof baseTickConfig === 'object') {
                    // If the layout specifies base configuration for ticks- but without specific positions- then ask each
                    //   data layer to report the tick marks that it thinks it needs
                    // TODO: Few layers currently need to specify custom ticks (which is ok!). But if it becomes common, consider adding mechanisms to deduplicate ticks across layers
                    var self = this;
                    // Pass any layer-specific customizations for how ticks are calculated. (styles are overridden separately)
                    var config = { position: baseTickConfig.position };
                    var combinedTicks = this.data_layer_ids_by_z_index.reduce(function (acc, data_layer_id) {
                        var nextLayer = self.data_layers[data_layer_id];
                        return acc.concat(nextLayer.getTicks(axis, config));
                    }, []);
                    return combinedTicks.map(function (item) {
                        // The layer makes suggestions, but tick configuration params specified on the panel take precedence
                        var itemConfig = {};
                        itemConfig = LocusZoom.Layouts.merge(itemConfig, baseTickConfig);
                        return LocusZoom.Layouts.merge(itemConfig, item);
                    });
                }
            }
            // If no other configuration is provided, attempt to generate ticks from the extent
            if (this[axis + '_extent']) {
                return LocusZoom.prettyTicks(this[axis + '_extent'], 'both');
            }
            return [];
        };
        /**
 * Update rendering of this panel whenever an event triggers a redraw. Assumes that the panel has already been
 *   prepared the first time via `initialize`
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.render = function () {
            // Position the panel container
            this.svg.container.attr('transform', 'translate(' + this.layout.origin.x + ',' + this.layout.origin.y + ')');
            // Set size on the clip rect
            this.svg.clipRect.attr('width', this.layout.width).attr('height', this.layout.height);
            // Set and position the inner border, style if necessary
            this.inner_border.attr('x', this.layout.margin.left).attr('y', this.layout.margin.top).attr('width', this.layout.width - (this.layout.margin.left + this.layout.margin.right)).attr('height', this.layout.height - (this.layout.margin.top + this.layout.margin.bottom));
            if (this.layout.inner_border) {
                this.inner_border.style({
                    'stroke-width': 1,
                    'stroke': this.layout.inner_border
                });
            }
            // Set/update panel title if necessary
            this.setTitle();
            // Regenerate all extents
            this.generateExtents();
            // Helper function to constrain any procedurally generated vectors (e.g. ranges, extents)
            // Constraints applied here keep vectors from going to infinity or beyond a definable power of ten
            var constrain = function (value, limit_exponent) {
                var neg_min = Math.pow(-10, limit_exponent);
                var neg_max = Math.pow(-10, -limit_exponent);
                var pos_min = Math.pow(10, -limit_exponent);
                var pos_max = Math.pow(10, limit_exponent);
                if (value === Infinity) {
                    value = pos_max;
                }
                if (value === -Infinity) {
                    value = neg_min;
                }
                if (value === 0) {
                    value = pos_min;
                }
                if (value > 0) {
                    value = Math.max(Math.min(value, pos_max), pos_min);
                }
                if (value < 0) {
                    value = Math.max(Math.min(value, neg_max), neg_min);
                }
                return value;
            };
            // Define default and shifted ranges for all axes
            var ranges = {};
            if (this.x_extent) {
                var base_x_range = {
                    start: 0,
                    end: this.layout.cliparea.width
                };
                if (this.layout.axes.x.range) {
                    base_x_range.start = this.layout.axes.x.range.start || base_x_range.start;
                    base_x_range.end = this.layout.axes.x.range.end || base_x_range.end;
                }
                ranges.x = [
                    base_x_range.start,
                    base_x_range.end
                ];
                ranges.x_shifted = [
                    base_x_range.start,
                    base_x_range.end
                ];
            }
            if (this.y1_extent) {
                var base_y1_range = {
                    start: this.layout.cliparea.height,
                    end: 0
                };
                if (this.layout.axes.y1.range) {
                    base_y1_range.start = this.layout.axes.y1.range.start || base_y1_range.start;
                    base_y1_range.end = this.layout.axes.y1.range.end || base_y1_range.end;
                }
                ranges.y1 = [
                    base_y1_range.start,
                    base_y1_range.end
                ];
                ranges.y1_shifted = [
                    base_y1_range.start,
                    base_y1_range.end
                ];
            }
            if (this.y2_extent) {
                var base_y2_range = {
                    start: this.layout.cliparea.height,
                    end: 0
                };
                if (this.layout.axes.y2.range) {
                    base_y2_range.start = this.layout.axes.y2.range.start || base_y2_range.start;
                    base_y2_range.end = this.layout.axes.y2.range.end || base_y2_range.end;
                }
                ranges.y2 = [
                    base_y2_range.start,
                    base_y2_range.end
                ];
                ranges.y2_shifted = [
                    base_y2_range.start,
                    base_y2_range.end
                ];
            }
            // Shift ranges based on any drag or zoom interactions currently underway
            if (this.parent.interaction.panel_id && (this.parent.interaction.panel_id === this.id || this.parent.interaction.linked_panel_ids.indexOf(this.id) !== -1)) {
                var anchor, scalar = null;
                if (this.parent.interaction.zooming && typeof this.x_scale == 'function') {
                    var current_extent_size = Math.abs(this.x_extent[1] - this.x_extent[0]);
                    var current_scaled_extent_size = Math.round(this.x_scale.invert(ranges.x_shifted[1])) - Math.round(this.x_scale.invert(ranges.x_shifted[0]));
                    var zoom_factor = this.parent.interaction.zooming.scale;
                    var potential_extent_size = Math.floor(current_scaled_extent_size * (1 / zoom_factor));
                    if (zoom_factor < 1 && !isNaN(this.parent.layout.max_region_scale)) {
                        zoom_factor = 1 / (Math.min(potential_extent_size, this.parent.layout.max_region_scale) / current_scaled_extent_size);
                    } else if (zoom_factor > 1 && !isNaN(this.parent.layout.min_region_scale)) {
                        zoom_factor = 1 / (Math.max(potential_extent_size, this.parent.layout.min_region_scale) / current_scaled_extent_size);
                    }
                    var new_extent_size = Math.floor(current_extent_size * zoom_factor);
                    anchor = this.parent.interaction.zooming.center - this.layout.margin.left - this.layout.origin.x;
                    var offset_ratio = anchor / this.layout.cliparea.width;
                    var new_x_extent_start = Math.max(Math.floor(this.x_scale.invert(ranges.x_shifted[0]) - (new_extent_size - current_scaled_extent_size) * offset_ratio), 1);
                    ranges.x_shifted = [
                        this.x_scale(new_x_extent_start),
                        this.x_scale(new_x_extent_start + new_extent_size)
                    ];
                } else if (this.parent.interaction.dragging) {
                    switch (this.parent.interaction.dragging.method) {
                    case 'background':
                        ranges.x_shifted[0] = +this.parent.interaction.dragging.dragged_x;
                        ranges.x_shifted[1] = this.layout.cliparea.width + this.parent.interaction.dragging.dragged_x;
                        break;
                    case 'x_tick':
                        if (d3.event && d3.event.shiftKey) {
                            ranges.x_shifted[0] = +this.parent.interaction.dragging.dragged_x;
                            ranges.x_shifted[1] = this.layout.cliparea.width + this.parent.interaction.dragging.dragged_x;
                        } else {
                            anchor = this.parent.interaction.dragging.start_x - this.layout.margin.left - this.layout.origin.x;
                            scalar = constrain(anchor / (anchor + this.parent.interaction.dragging.dragged_x), 3);
                            ranges.x_shifted[0] = 0;
                            ranges.x_shifted[1] = Math.max(this.layout.cliparea.width * (1 / scalar), 1);
                        }
                        break;
                    case 'y1_tick':
                    case 'y2_tick':
                        var y_shifted = 'y' + this.parent.interaction.dragging.method[1] + '_shifted';
                        if (d3.event && d3.event.shiftKey) {
                            ranges[y_shifted][0] = this.layout.cliparea.height + this.parent.interaction.dragging.dragged_y;
                            ranges[y_shifted][1] = +this.parent.interaction.dragging.dragged_y;
                        } else {
                            anchor = this.layout.cliparea.height - (this.parent.interaction.dragging.start_y - this.layout.margin.top - this.layout.origin.y);
                            scalar = constrain(anchor / (anchor - this.parent.interaction.dragging.dragged_y), 3);
                            ranges[y_shifted][0] = this.layout.cliparea.height;
                            ranges[y_shifted][1] = this.layout.cliparea.height - this.layout.cliparea.height * (1 / scalar);
                        }
                    }
                }
            }
            // Generate scales and ticks for all axes, then render them
            [
                'x',
                'y1',
                'y2'
            ].forEach(function (axis) {
                if (!this[axis + '_extent']) {
                    return;
                }
                // Base Scale
                this[axis + '_scale'] = d3.scale.linear().domain(this[axis + '_extent']).range(ranges[axis + '_shifted']);
                // Shift the extent
                this[axis + '_extent'] = [
                    this[axis + '_scale'].invert(ranges[axis][0]),
                    this[axis + '_scale'].invert(ranges[axis][1])
                ];
                // Finalize Scale
                this[axis + '_scale'] = d3.scale.linear().domain(this[axis + '_extent']).range(ranges[axis]);
                // Render axis (and generate ticks as needed)
                this.renderAxis(axis);
            }.bind(this));
            // Establish mousewheel zoom event handers on the panel (namespacing not passed through by d3, so not used here)
            if (this.layout.interaction.scroll_to_zoom) {
                var zoom_handler = function () {
                    // Look for a shift key press while scrolling to execute.
                    // If not present, gracefully raise a notification and allow conventional scrolling
                    if (!d3.event.shiftKey) {
                        if (this.parent.canInteract(this.id)) {
                            this.loader.show('Press <tt>[SHIFT]</tt> while scrolling to zoom').hide(1000);
                        }
                        return;
                    }
                    d3.event.preventDefault();
                    if (!this.parent.canInteract(this.id)) {
                        return;
                    }
                    var coords = d3.mouse(this.svg.container.node());
                    var delta = Math.max(-1, Math.min(1, d3.event.wheelDelta || -d3.event.detail || -d3.event.deltaY));
                    if (delta === 0) {
                        return;
                    }
                    this.parent.interaction = {
                        panel_id: this.id,
                        linked_panel_ids: this.getLinkedPanelIds('x'),
                        zooming: {
                            scale: delta < 1 ? 0.9 : 1.1,
                            center: coords[0]
                        }
                    };
                    this.render();
                    this.parent.interaction.linked_panel_ids.forEach(function (panel_id) {
                        this.parent.panels[panel_id].render();
                    }.bind(this));
                    if (this.zoom_timeout !== null) {
                        clearTimeout(this.zoom_timeout);
                    }
                    this.zoom_timeout = setTimeout(function () {
                        this.parent.interaction = {};
                        this.parent.applyState({
                            start: this.x_extent[0],
                            end: this.x_extent[1]
                        });
                    }.bind(this), 500);
                }.bind(this);
                this.zoom_listener = d3.behavior.zoom();
                this.svg.container.call(this.zoom_listener).on('wheel.zoom', zoom_handler).on('mousewheel.zoom', zoom_handler).on('DOMMouseScroll.zoom', zoom_handler);
            }
            // Render data layers in order by z-index
            this.data_layer_ids_by_z_index.forEach(function (data_layer_id) {
                this.data_layers[data_layer_id].draw().render();
            }.bind(this));
            return this;
        };
        /**
 * Render ticks for a particular axis
 * @param {('x'|'y1'|'y2')} axis The identifier of the axes
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.renderAxis = function (axis) {
            if ([
                    'x',
                    'y1',
                    'y2'
                ].indexOf(axis) === -1) {
                throw 'Unable to render axis; invalid axis identifier: ' + axis;
            }
            var canRender = this.layout.axes[axis].render && typeof this[axis + '_scale'] == 'function' && !isNaN(this[axis + '_scale'](0));
            // If the axis has already been rendered then check if we can/can't render it
            // Make sure the axis element is shown/hidden to suit
            if (this[axis + '_axis']) {
                this.svg.container.select('g.lz-axis.lz-' + axis).style('display', canRender ? null : 'none');
            }
            if (!canRender) {
                return this;
            }
            // Axis-specific values to plug in where needed
            var axis_params = {
                x: {
                    position: 'translate(' + this.layout.margin.left + ',' + (this.layout.height - this.layout.margin.bottom) + ')',
                    orientation: 'bottom',
                    label_x: this.layout.cliparea.width / 2,
                    label_y: this.layout.axes[axis].label_offset || 0,
                    label_rotate: null
                },
                y1: {
                    position: 'translate(' + this.layout.margin.left + ',' + this.layout.margin.top + ')',
                    orientation: 'left',
                    label_x: -1 * (this.layout.axes[axis].label_offset || 0),
                    label_y: this.layout.cliparea.height / 2,
                    label_rotate: -90
                },
                y2: {
                    position: 'translate(' + (this.layout.width - this.layout.margin.right) + ',' + this.layout.margin.top + ')',
                    orientation: 'right',
                    label_x: this.layout.axes[axis].label_offset || 0,
                    label_y: this.layout.cliparea.height / 2,
                    label_rotate: -90
                }
            };
            // Generate Ticks
            this[axis + '_ticks'] = this.generateTicks(axis);
            // Determine if the ticks are all numbers (d3-automated tick rendering) or not (manual tick rendering)
            var ticksAreAllNumbers = function (ticks) {
                for (var i = 0; i < ticks.length; i++) {
                    if (isNaN(ticks[i])) {
                        return false;
                    }
                }
                return true;
            }(this[axis + '_ticks']);
            // Initialize the axis; set scale and orientation
            this[axis + '_axis'] = d3.svg.axis().scale(this[axis + '_scale']).orient(axis_params[axis].orientation).tickPadding(3);
            // Set tick values and format
            if (ticksAreAllNumbers) {
                this[axis + '_axis'].tickValues(this[axis + '_ticks']);
                if (this.layout.axes[axis].tick_format === 'region') {
                    this[axis + '_axis'].tickFormat(function (d) {
                        return LocusZoom.positionIntToString(d, 6);
                    });
                }
            } else {
                var ticks = this[axis + '_ticks'].map(function (t) {
                    return t[axis.substr(0, 1)];
                });
                this[axis + '_axis'].tickValues(ticks).tickFormat(function (t, i) {
                    return this[axis + '_ticks'][i].text;
                }.bind(this));
            }
            // Position the axis in the SVG and apply the axis construct
            this.svg[axis + '_axis'].attr('transform', axis_params[axis].position).call(this[axis + '_axis']);
            // If necessary manually apply styles and transforms to ticks as specified by the layout
            if (!ticksAreAllNumbers) {
                var tick_selector = d3.selectAll('g#' + this.getBaseId().replace('.', '\\.') + '\\.' + axis + '_axis g.tick');
                var panel = this;
                tick_selector.each(function (d, i) {
                    var selector = d3.select(this).select('text');
                    if (panel[axis + '_ticks'][i].style) {
                        selector.style(panel[axis + '_ticks'][i].style);
                    }
                    if (panel[axis + '_ticks'][i].transform) {
                        selector.attr('transform', panel[axis + '_ticks'][i].transform);
                    }
                });
            }
            // Render the axis label if necessary
            var label = this.layout.axes[axis].label || null;
            if (label !== null) {
                this.svg[axis + '_axis_label'].attr('x', axis_params[axis].label_x).attr('y', axis_params[axis].label_y).text(LocusZoom.parseFields(this.state, label));
                if (axis_params[axis].label_rotate !== null) {
                    this.svg[axis + '_axis_label'].attr('transform', 'rotate(' + axis_params[axis].label_rotate + ' ' + axis_params[axis].label_x + ',' + axis_params[axis].label_y + ')');
                }
            }
            // Attach interactive handlers to ticks as needed
            [
                'x',
                'y1',
                'y2'
            ].forEach(function (axis) {
                if (this.layout.interaction['drag_' + axis + '_ticks_to_scale']) {
                    var namespace = '.' + this.parent.id + '.' + this.id + '.interaction.drag';
                    var tick_mouseover = function () {
                        if (typeof d3.select(this).node().focus == 'function') {
                            d3.select(this).node().focus();
                        }
                        var cursor = axis === 'x' ? 'ew-resize' : 'ns-resize';
                        if (d3.event && d3.event.shiftKey) {
                            cursor = 'move';
                        }
                        d3.select(this).style({
                            'font-weight': 'bold',
                            'cursor': cursor
                        }).on('keydown' + namespace, tick_mouseover).on('keyup' + namespace, tick_mouseover);
                    };
                    this.svg.container.selectAll('.lz-axis.lz-' + axis + ' .tick text').attr('tabindex', 0)    // necessary to make the tick focusable so keypress events can be captured
.on('mouseover' + namespace, tick_mouseover).on('mouseout' + namespace, function () {
                        d3.select(this).style({ 'font-weight': 'normal' });
                        d3.select(this).on('keydown' + namespace, null).on('keyup' + namespace, null);
                    }).on('mousedown' + namespace, function () {
                        this.parent.startDrag(this, axis + '_tick');
                    }.bind(this));
                }
            }.bind(this));
            return this;
        };
        /**
 * Force the height of this panel to the largest absolute height of the data in
 *   all child data layers (if not null for any child data layers)
 * @param {number} [target_height] A target height, which will be used in situations when the expected height can be
 *   pre-calculated (eg when the layers are transitioning)
 */
        LocusZoom.Panel.prototype.scaleHeightToData = function (target_height) {
            target_height = +target_height || null;
            if (target_height === null) {
                this.data_layer_ids_by_z_index.forEach(function (id) {
                    var dh = this.data_layers[id].getAbsoluteDataHeight();
                    if (+dh) {
                        if (target_height === null) {
                            target_height = +dh;
                        } else {
                            target_height = Math.max(target_height, +dh);
                        }
                    }
                }.bind(this));
            }
            if (+target_height) {
                target_height += +this.layout.margin.top + +this.layout.margin.bottom;
                this.setDimensions(this.layout.width, target_height);
                this.parent.setDimensions();
                this.parent.panel_ids_by_y_index.forEach(function (id) {
                    this.parent.panels[id].layout.proportional_height = null;
                }.bind(this));
                this.parent.positionPanels();
            }
        };
        /**
 * Methods to set/unset element statuses across all data layers
 * @param {String} status
 * @param {Boolean} toggle
 * @param {Array} filters
 * @param {Boolean} exclusive
 */
        LocusZoom.Panel.prototype.setElementStatusByFilters = function (status, toggle, filters, exclusive) {
            this.data_layer_ids_by_z_index.forEach(function (id) {
                this.data_layers[id].setElementStatusByFilters(status, toggle, filters, exclusive);
            }.bind(this));
        };
        /**
 * Set/unset element statuses across all data layers
 * @param {String} status
 * @param {Boolean} toggle
 */
        LocusZoom.Panel.prototype.setAllElementStatus = function (status, toggle) {
            this.data_layer_ids_by_z_index.forEach(function (id) {
                this.data_layers[id].setAllElementStatus(status, toggle);
            }.bind(this));
        };
        // TODO: Capture documentation for dynamically generated methods
        LocusZoom.DataLayer.Statuses.verbs.forEach(function (verb, idx) {
            var adjective = LocusZoom.DataLayer.Statuses.adjectives[idx];
            var antiverb = 'un' + verb;
            // Set/unset status for arbitrarily many elements given a set of filters
            LocusZoom.Panel.prototype[verb + 'ElementsByFilters'] = function (filters, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                return this.setElementStatusByFilters(adjective, true, filters, exclusive);
            };
            LocusZoom.Panel.prototype[antiverb + 'ElementsByFilters'] = function (filters, exclusive) {
                if (typeof exclusive == 'undefined') {
                    exclusive = false;
                } else {
                    exclusive = !!exclusive;
                }
                return this.setElementStatusByFilters(adjective, false, filters, exclusive);
            };
            // Set/unset status for all elements
            LocusZoom.Panel.prototype[verb + 'AllElements'] = function () {
                this.setAllElementStatus(adjective, true);
                return this;
            };
            LocusZoom.Panel.prototype[antiverb + 'AllElements'] = function () {
                this.setAllElementStatus(adjective, false);
                return this;
            };
        });
        /**
 * Add a "basic" loader to a panel
 * This method is just a shortcut for adding the most commonly used type of loading indicator, which appears when
 *   data is requested, animates (e.g. shows an infinitely cycling progress bar as opposed to one that loads from
 *   0-100% based on actual load progress), and disappears when new data is loaded and rendered.
 *
 *
 * @param {Boolean} show_immediately
 * @returns {LocusZoom.Panel}
 */
        LocusZoom.Panel.prototype.addBasicLoader = function (show_immediately) {
            if (typeof show_immediately != 'undefined') {
                show_immediately = true;
            }
            if (show_immediately) {
                this.loader.show('Loading...').animate();
            }
            this.on('data_requested', function () {
                this.loader.show('Loading...').animate();
            }.bind(this));
            this.on('data_rendered', function () {
                this.loader.hide();
            }.bind(this));
            return this;
        };
    } catch (plugin_loading_error) {
        console.error('LocusZoom Plugin error: ' + plugin_loading_error);
    }
    return LocusZoom;
}));
//# sourceMappingURL=locuszoom.app.js.map

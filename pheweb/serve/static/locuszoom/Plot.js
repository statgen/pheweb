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
LocusZoom.Plot = function(id, datasource, layout) {
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
    this.applyPanelYIndexesToPanelLayouts = function() {
        this.panel_ids_by_y_index.forEach(function(pid, idx) {
            this.panels[pid].layout.y_index = idx;
        }.bind(this));
    };

    /**
     * Get the qualified ID pathname for the plot
     * @returns {String}
     */
    this.getBaseId = function() {
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
        'element_clicked': [], // Select or unselect
        'element_selection': [], // Element becomes active (only)
        'match_requested': [], // A data layer is attempting to highlight matching points (internal use only)
        'panel_removed': [],
        'state_changed': []  // Only triggered when a state change causes rerender
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
    this.on = function(event, hook) {
        if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
            throw new Error('Unable to register event hook, invalid event: ' + event.toString());
        }
        if (typeof hook != 'function') {
            throw new Error('Unable to register event hook, invalid hook function passed');
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
    this.off = function(event, hook) {
        var theseHooks = this.event_hooks[event];
        if (typeof 'event' != 'string' || !Array.isArray(theseHooks)) {
            throw new Error('Unable to remove event hook, invalid event: ' + event.toString());
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
                throw new Error('The specified event listener is not registered and therefore cannot be removed');
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
    this.emit = function(event, eventData) {
        // TODO: there are small differences between the emit implementation between plots and panels. In the future,
        //  DRY this code via mixins, and make sure to keep the interfaces compatible when refactoring.
        if (typeof 'event' != 'string' || !Array.isArray(this.event_hooks[event])) {
            throw new Error('LocusZoom attempted to throw an invalid event: ' + event.toString());
        }
        var sourceID = this.getBaseId();
        var self = this;
        this.event_hooks[event].forEach(function(hookToRun) {
            var eventContext;
            if (eventData && eventData.sourceID) {
                // If we detect that an event originated elsewhere (via bubbling or externally), preserve the context
                //  when re-emitting the event to plot-level listeners
                eventContext = eventData;
            } else {
                eventContext = {sourceID: sourceID, data: eventData || null};
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
     *  This returns a result with absolute position relative to the page, regardless of current scrolling
     * Necessary for positioning any HTML elements over the plot
     * @returns {{x: Number, y: Number, width: Number, height: Number}}
     */
    this.getPageOrigin = function() {
        var bounding_client_rect = this.svg.node().getBoundingClientRect();
        var x_offset = document.documentElement.scrollLeft || document.body.scrollLeft;
        var y_offset = document.documentElement.scrollTop || document.body.scrollTop;
        var container = this.svg.node();
        while (container.parentNode !== null) {
            // TODO: Recursively seeks offsets for highest non-static parent node. This can lead to incorrect
            //   calculations of, for example, x coordinate relative to the page. Revisit this logic.
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
    this.getContainerOffset = function() {
        var offset = { top: 0, left: 0 };
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
    this.canInteract = function(panel_id) {
        panel_id = panel_id || null;
        if (panel_id) {
            return ((typeof this.interaction.panel_id == 'undefined' || this.interaction.panel_id === panel_id) && !this.loading_data);
        } else {
            return !(this.interaction.dragging || this.interaction.zooming || this.loading_data);
        }
    };

    // Initialize the layout
    this.initializeLayout();
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
    responsive_resize: false, // Allowed values: false, "width_only", "both" (synonym for true)
    aspect_ratio: 1,
    panels: [],
    dashboard: {
        components: []
    },
    panel_boundaries: true,
    mouse_guide: true
};

/**
 * Helper method to sum the proportional dimensions of panels, a value that's checked often as panels are added/removed
 * @param {('Height'|'Width')} dimension
 * @returns {number}
 */
LocusZoom.Plot.prototype.sumProportional = function(dimension) {
    if (dimension !== 'height' && dimension !== 'width') {
        throw new Error('Bad dimension value passed to LocusZoom.Plot.prototype.sumProportional');
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
LocusZoom.Plot.prototype.rescaleSVG = function() {
    var clientRect = this.svg.node().getBoundingClientRect();
    this.setDimensions(clientRect.width, clientRect.height);
    return this;
};

/**
 * Prepare the plot for first use by performing parameter validation, setting up panels, and calculating dimensions
 * @returns {LocusZoom.Plot}
 */
LocusZoom.Plot.prototype.initializeLayout = function() {

    // Sanity check layout values
    if (isNaN(this.layout.width) || this.layout.width <= 0) {
        throw new Error('Plot layout parameter `width` must be a positive number');
    }
    if (isNaN(this.layout.height) || this.layout.height <= 0) {
        throw new Error('Plot layout parameter `width` must be a positive number');
    }
    if (isNaN(this.layout.aspect_ratio) || this.layout.aspect_ratio <= 0) {
        throw new Error('Plot layout parameter `aspect_ratio` must be a positive number');
    }
    if (this.layout.responsive_resize === true) {
        // Backwards compatible support
        console.warn('LocusZoom "responsive_resize" specifies a deprecated value. The new value should be "both". Please update your layout.');
        this.layout.responsive_resize = 'both';
    }
    var RESIZE_MODES = [false, 'both', 'width_only'];
    if (RESIZE_MODES.indexOf(this.layout.responsive_resize) === -1) {
        throw new Error('LocusZoom option "responsive_resize" should specify one of the following modes: ' + RESIZE_MODES.join(', '));
    }

    // If this is a responsive layout then set a namespaced/unique onresize event listener on the window
    if (this.layout.responsive_resize) {
        this.window_onresize = d3.select(window).on('resize.lz-' + this.id, function() {
            this.rescaleSVG();
        }.bind(this));
        // Forcing one additional setDimensions() call after the page is loaded clears up
        // any disagreements between the initial layout and the loaded responsive container's size
        d3.select(window).on('load.lz-' + this.id, function() {
            this.setDimensions();
        }.bind(this));
    }

    // Add panels
    this.layout.panels.forEach(function(panel_layout) {
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
LocusZoom.Plot.prototype.setDimensions = function(width, height) {

    var id;

    // Update minimum allowable width and height by aggregating minimums from panels, then apply minimums to containing element.
    var min_width = parseFloat(this.layout.min_width) || 0;
    var min_height = parseFloat(this.layout.min_height) || 0;
    for (id in this.panels) {
        min_width = Math.max(min_width, this.panels[id].layout.min_width);
        if (parseFloat(this.panels[id].layout.min_height) > 0 && parseFloat(this.panels[id].layout.proportional_height) > 0) {
            min_height = Math.max(min_height, (this.panels[id].layout.min_height / this.panels[id].layout.proportional_height));
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
            // All resize modes will affect width
            if (this.svg) {
                this.layout.width = Math.max(this.svg.node().parentNode.getBoundingClientRect().width, this.layout.min_width);
            }

            if (this.layout.responsive_resize === 'both') { // Then also change the height
                this.layout.height = this.layout.width / this.layout.aspect_ratio;
                if (this.layout.height < this.layout.min_height) {
                    this.layout.height = this.layout.min_height;
                    this.layout.width  = this.layout.height * this.layout.aspect_ratio;
                }
            }
        }
        // Resize/reposition panels to fit, update proportional origins if necessary
        var y_offset = 0;
        this.panel_ids_by_y_index.forEach(function(panel_id) {
            var panel_width = this.layout.width;
            var panel_height = this.panels[panel_id].layout.proportional_height * this.layout.height;
            this.panels[panel_id].setDimensions(panel_width, panel_height);
            this.panels[panel_id].setOrigin(0, y_offset);
            this.panels[panel_id].layout.proportional_origin.x = 0;
            this.panels[panel_id].layout.proportional_origin.y = y_offset / this.layout.height;
            y_offset += panel_height;
            this.panels[panel_id].dashboard.update();
        }.bind(this));
    }

    // If width and height arguments were NOT passed (and panels exist) then determine the plot dimensions
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
        if (this.layout.responsive_resize === 'both') {
            this.svg
                .attr('viewBox', '0 0 ' + this.layout.width + ' ' + this.layout.height)
                .attr('preserveAspectRatio', 'xMinYMin meet');
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
LocusZoom.Plot.prototype.addPanel = function(layout) {

    // Sanity checks
    if (typeof layout !== 'object') {
        throw new Error('Invalid panel layout passed to LocusZoom.Plot.prototype.addPanel()');
    }

    // Create the Panel and set its parent
    var panel = new LocusZoom.Panel(layout, this);

    // Store the Panel on the Plot
    this.panels[panel.id] = panel;

    // If a discrete y_index was set in the layout then adjust other panel y_index values to accommodate this one
    if (panel.layout.y_index !== null && !isNaN(panel.layout.y_index)
        && this.panel_ids_by_y_index.length > 0) {
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
    this.layout.panels.forEach(function(panel_layout, idx) {
        if (panel_layout.id === panel.id) { layout_idx = idx; }
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
LocusZoom.Plot.prototype.clearPanelData = function(panelId, mode) {
    mode = mode || 'wipe';

    // TODO: Add unit tests for this method
    var panelsList;
    if (panelId) {
        panelsList = [panelId];
    } else {
        panelsList = Object.keys(this.panels);
    }
    var self = this;
    panelsList.forEach(function(pid) {
        self.panels[pid].data_layer_ids_by_z_index.forEach(function(dlid) {
            var layer = self.panels[pid].data_layers[dlid];
            layer.destroyAllTooltips();

            delete layer.layer_state;
            delete self.layout.state[layer.state_id];
            if(mode === 'reset') {
                layer._setDefaultState();
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
LocusZoom.Plot.prototype.removePanel = function(id) {
    if (!this.panels[id]) {
        throw new Error('Unable to remove panel, ID not found: ' + id);
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
    this.layout.panels.forEach(function(panel_layout, idx) {
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

    this.emit('panel_removed', id);

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
LocusZoom.Plot.prototype.positionPanels = function() {

    var id;

    // We want to enforce that all x-linked panels have consistent horizontal margins
    // (to ensure that aligned items stay aligned despite inconsistent initial layout parameters)
    // NOTE: This assumes panels have consistent widths already. That should probably be enforced too!
    var x_linked_margins = { left: 0, right: 0 };

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
    this.panel_ids_by_y_index.forEach(function(panel_id) {
        this.panels[panel_id].setOrigin(0, y_offset);
        this.panels[panel_id].layout.proportional_origin.x = 0;
        y_offset += this.panels[panel_id].layout.height;
        if (this.panels[panel_id].layout.interaction.x_linked) {
            var delta = Math.max(x_linked_margins.left - this.panels[panel_id].layout.margin.left, 0)
                      + Math.max(x_linked_margins.right - this.panels[panel_id].layout.margin.right, 0);
            this.panels[panel_id].layout.width += delta;
            this.panels[panel_id].layout.margin.left = x_linked_margins.left;
            this.panels[panel_id].layout.margin.right = x_linked_margins.right;
            this.panels[panel_id].layout.cliparea.origin.x = x_linked_margins.left;
        }
    }.bind(this));
    var calculated_plot_height = y_offset;
    this.panel_ids_by_y_index.forEach(function(panel_id) {
        this.panels[panel_id].layout.proportional_origin.y = this.panels[panel_id].layout.origin.y / calculated_plot_height;
    }.bind(this));

    // Update dimensions on the plot to accommodate repositioned panels
    this.setDimensions();

    // Set dimensions on all panels using newly set plot-level dimensions and panel-level proportional dimensions
    this.panel_ids_by_y_index.forEach(function(panel_id) {
        this.panels[panel_id].setDimensions(this.layout.width * this.panels[panel_id].layout.proportional_width,
                                            this.layout.height * this.panels[panel_id].layout.proportional_height);
    }.bind(this));

    return this;

};

/**
 * Prepare the first rendering of the plot. This includes initializing the individual panels, but also creates shared
 *   elements such as mouse events, panel guides/boundaries, and loader/curtain.
 *
 * @returns {LocusZoom.Plot}
 */
LocusZoom.Plot.prototype.initialize = function() {

    // Ensure proper responsive class is present on the containing node if called for
    if (this.layout.responsive_resize) {
        d3.select(this.container).classed('lz-container-responsive', true);
    }

    // Create an element/layer for containing mouse guides
    if (this.layout.mouse_guide) {
        var mouse_guide_svg = this.svg.append('g')
            .attr('class', 'lz-mouse_guide').attr('id', this.id + '.mouse_guide');
        var mouse_guide_vertical_svg = mouse_guide_svg.append('rect')
            .attr('class', 'lz-mouse_guide-vertical').attr('x',-1);
        var mouse_guide_horizontal_svg = mouse_guide_svg.append('rect')
            .attr('class', 'lz-mouse_guide-horizontal').attr('y',-1);
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
        show: function() {
            // Generate panel boundaries
            if (!this.showing && !this.parent.curtain.showing) {
                this.showing = true;
                // Loop through all panels to create a horizontal boundary for each
                this.parent.panel_ids_by_y_index.forEach(function(panel_id, panel_idx) {
                    var selector = d3.select(this.parent.svg.node().parentNode).insert('div', '.lz-data_layer-tooltip')
                        .attr('class', 'lz-panel-boundary')
                        .attr('title', 'Resize panel');
                    selector.append('span');
                    var panel_resize_drag = d3.behavior.drag();
                    panel_resize_drag.on('dragstart', function() { this.dragging = true; }.bind(this));
                    panel_resize_drag.on('dragend', function() { this.dragging = false; }.bind(this));
                    panel_resize_drag.on('drag', function() {
                        // First set the dimensions on the panel we're resizing
                        var this_panel = this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]];
                        var original_panel_height = this_panel.layout.height;
                        this_panel.setDimensions(this_panel.layout.width, this_panel.layout.height + d3.event.dy);
                        var panel_height_change = this_panel.layout.height - original_panel_height;
                        var new_calculated_plot_height = this.parent.layout.height + panel_height_change;
                        // Next loop through all panels.
                        // Update proportional dimensions for all panels including the one we've resized using discrete heights.
                        // Reposition panels with a greater y-index than this panel to their appropriate new origin.
                        this.parent.panel_ids_by_y_index.forEach(function(loop_panel_id, loop_panel_idx) {
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
                var corner_selector = d3.select(this.parent.svg.node().parentNode).insert('div', '.lz-data_layer-tooltip')
                    .attr('class', 'lz-panel-corner-boundary')
                    .attr('title', 'Resize plot');
                corner_selector.append('span').attr('class', 'lz-panel-corner-boundary-outer');
                corner_selector.append('span').attr('class', 'lz-panel-corner-boundary-inner');
                var corner_drag = d3.behavior.drag();
                corner_drag.on('dragstart', function() { this.dragging = true; }.bind(this));
                corner_drag.on('dragend', function() { this.dragging = false; }.bind(this));
                corner_drag.on('drag', function() {
                    this.setDimensions(this.layout.width + d3.event.dx, this.layout.height + d3.event.dy);
                }.bind(this.parent));
                corner_selector.call(corner_drag);
                this.parent.panel_boundaries.corner_selector = corner_selector;
            }
            return this.position();
        },
        position: function() {
            if (!this.showing) { return this; }
            // Position panel boundaries
            var plot_page_origin = this.parent.getPageOrigin();
            this.selectors.forEach(function(selector, panel_idx) {
                var panel_page_origin = this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]].getPageOrigin();
                var left = plot_page_origin.x;
                var top = panel_page_origin.y + this.parent.panels[this.parent.panel_ids_by_y_index[panel_idx]].layout.height - 12;
                var width = this.parent.layout.width - 1;
                selector.style({
                    top: top + 'px',
                    left: left + 'px',
                    width: width + 'px'
                });
                selector.select('span').style({
                    width: width + 'px'
                });
            }.bind(this));
            // Position corner selector
            var corner_padding = 10;
            var corner_size = 16;
            this.corner_selector.style({
                top: (plot_page_origin.y + this.parent.layout.height - corner_padding - corner_size) + 'px',
                left: (plot_page_origin.x + this.parent.layout.width - corner_padding - corner_size) + 'px'
            });
            return this;
        },
        hide: function() {
            if (!this.showing) { return this; }
            this.showing = false;
            // Remove panel boundaries
            this.selectors.forEach(function(selector) { selector.remove(); });
            this.selectors = [];
            // Remove corner boundary
            this.corner_selector.remove();
            this.corner_selector = null;
            return this;
        }
    };

    // Show panel boundaries stipulated by the layout (basic toggle, only show on mouse over plot)
    if (this.layout.panel_boundaries) {
        d3.select(this.svg.node().parentNode).on('mouseover.' + this.id + '.panel_boundaries', function() {
            clearTimeout(this.panel_boundaries.hide_timeout);
            this.panel_boundaries.show();
        }.bind(this));
        d3.select(this.svg.node().parentNode).on('mouseout.' + this.id + '.panel_boundaries', function() {
            this.panel_boundaries.hide_timeout = setTimeout(function() {
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
        var mouseout_mouse_guide = function() {
            this.mouse_guide.vertical.attr('x', -1);
            this.mouse_guide.horizontal.attr('y', -1);
        }.bind(this);
        var mousemove_mouse_guide = function() {
            var coords = d3.mouse(this.svg.node());
            this.mouse_guide.vertical.attr('x', coords[0]);
            this.mouse_guide.horizontal.attr('y', coords[1]);
        }.bind(this);
        this.svg
            .on('mouseout' + namespace + '-mouse_guide', mouseout_mouse_guide)
            .on('touchleave' + namespace + '-mouse_guide', mouseout_mouse_guide)
            .on('mousemove' + namespace + '-mouse_guide', mousemove_mouse_guide);
    }
    var mouseup = function() {
        this.stopDrag();
    }.bind(this);
    var mousemove = function() {
        if (this.interaction.dragging) {
            var coords = d3.mouse(this.svg.node());
            if (d3.event) { d3.event.preventDefault(); }
            this.interaction.dragging.dragged_x = coords[0] - this.interaction.dragging.start_x;
            this.interaction.dragging.dragged_y = coords[1] - this.interaction.dragging.start_y;
            this.panels[this.interaction.panel_id].render();
            this.interaction.linked_panel_ids.forEach(function(panel_id) {
                this.panels[panel_id].render();
            }.bind(this));
        }
    }.bind(this);
    this.svg
        .on('mouseup' + namespace, mouseup)
        .on('touchend' + namespace, mouseup)
        .on('mousemove' + namespace, mousemove)
        .on('touchmove' + namespace, mousemove);

    // Add an extra namespaced mouseup handler to the containing body, if there is one
    // This helps to stop interaction events gracefully when dragging outside of the plot element
    if (!d3.select('body').empty()) {
        d3.select('body')
            .on('mouseup' + namespace, mouseup)
            .on('touchend' + namespace, mouseup);
    }

    this.on('match_requested', function(eventData) {
        // Layers can broadcast that a specific point has been selected, and the plot will tell every other layer
        //  to look for that value. Whenever a point is de-selected, it clears the match.
        var data = eventData.data;
        var to_send = (data.active ? data.value : null);
        this.applyState({ lz_match_value: to_send });
    }.bind(this));

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
LocusZoom.Plot.prototype.refresh = function() {
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
LocusZoom.Plot.prototype.subscribeToData = function(fields, success_callback, opts) {
    opts = opts || {};

    // Register an event listener that is notified whenever new data has been rendered
    var error_callback = opts.onerror || function(err) {
        console.log('An error occurred while acting on an external callback', err);
    };
    var self = this;

    var listener = function() {
        try {
            self.lzd.getData(self.state, fields)
                .then(function (new_data) {
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
LocusZoom.Plot.prototype.applyState = function(state_changes) {
    state_changes = state_changes || {};
    if (typeof state_changes != 'object') {
        throw new Error('LocusZoom.applyState only accepts an object; ' + (typeof state_changes) + ' given');
    }

    // Track what parameters will be modified. For bounds checking, we must take some preset values into account.
    var mods = { chr: this.state.chr, start: this.state.start, end: this.state.end  };
    for (var property in state_changes) {
        mods[property] = state_changes[property];
    }
    mods = LocusZoom._updateStatePosition(mods, this.layout);

    // Apply new state to the actual state
    for (property in mods) {
        this.state[property] = mods[property];
    }

    // Generate requests for all panels given new state
    this.emit('data_requested');
    this.remap_promises = [];
    this.loading_data = true;
    for (var id in this.panels) {
        this.remap_promises.push(this.panels[id].reMap());
    }

    return Promise.all(this.remap_promises)
        .catch(function(error) {
            console.error(error);
            this.curtain.show(error.message || error);
            this.loading_data = false;
        }.bind(this))
        .then(function() {
            // Update dashboard / components
            this.dashboard.update();

            // Apply panel-level state values
            this.panel_ids_by_y_index.forEach(function(panel_id) {
                var panel = this.panels[panel_id];
                panel.dashboard.update();
                // Apply data-layer-level state values
                panel.data_layer_ids_by_z_index.forEach(function(data_layer_id) {
                    this.data_layers[data_layer_id].applyAllElementStatus();
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
LocusZoom.Plot.prototype.startDrag = function(panel, method) {

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

    if (!(panel instanceof LocusZoom.Panel) || !axis || !this.canInteract()) { return this.stopDrag(); }

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
LocusZoom.Plot.prototype.stopDrag = function() {

    if (!this.interaction.dragging) { return this; }

    if (typeof this.panels[this.interaction.panel_id] != 'object') {
        this.interaction = {};
        return this;
    }
    var panel = this.panels[this.interaction.panel_id];

    // Helper function to find the appropriate axis layouts on child data layers
    // Once found, apply the extent as floor/ceiling and remove all other directives
    // This forces all associated axes to conform to the extent generated by a drag action
    var overrideAxisLayout = function(axis, axis_number, extent) {
        panel.data_layer_ids_by_z_index.forEach(function(id) {
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

    switch(this.interaction.dragging.method) {
    case 'background':
    case 'x_tick':
        if (this.interaction.dragging.dragged_x !== 0) {
            overrideAxisLayout('x', 1, panel.x_extent);
            this.applyState({ start: panel.x_extent[0], end: panel.x_extent[1] });
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

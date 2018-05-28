window.stream_table_sortingFunc = function(data, options){

    var field = options.field, order = options.order, type = options.type;

    if (type ==  'number'){
	return function(i, j){
	    return (data[i][field] - data[j][field]) * order;
	}
    }

    if (type == 'mixed'){
	return function(i, j) {
	    if ($.isNumeric(data[i][field]) && !$.isNumeric(data[j][field])) {
		return 1 * order;
	    } else if ($.isNumeric(data[j][field]) && !$.isNumeric(data[i][field])) {
		return -1 * order;
	    } else if ($.isNumeric(data[j][field]) && $.isNumeric(data[i][field])) {
		return (data[i][field] - data[j][field]) * order;
	    } else {
		var t1 = data[i][field].toLowerCase()
		,t2 = data[j][field].toLowerCase();
		if (t1 < t2) return (-1 * order);
		if (t1 > t2) return (1 * order);
		return 0;
	    }
	}
    }

    return function(i, j){
	var t1 = data[i][field].toLowerCase()
        ,t2 = data[j][field].toLowerCase();

	if (t1 < t2) return (-1 * order);
	if (t1 > t2) return (1 * order);
	return 0;
    }
};

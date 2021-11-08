import React , { useState, useEffect , useContext } from 'react';
import mustache from 'mustache';

interface Props {};
interface QueryResult {};

const NotFound = (props : Props) => {
      const search = props.location.search;
      const query = new URLSearchParams(search).get('query');
      const message = `
      Could not found page for ${query}
      `
      /* 1. add default template
      	 2. get tempalte from configuration
	 p.s. wait until configuration arrives
	*/
      const message = ``;
      
      return <div>
      </div>
}

export default NotFound


/*
@app.route('/go')
def go():
    query = request.args.get('query', None)
    if query is None:
        die("How did you manage to get a null query?")
    best_suggestion = autocompleter.get_best_completion(query)
    if best_suggestion:
        return redirect(best_suggestion['url'])
    die("Couldn't find page for {!r}".format(query))


*/
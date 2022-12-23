import React from 'react'
import AsyncSelect from 'react-select/async'
import { getAutocomplete } from "./searchAPI";
import { SearchResult } from "./searchModel";

const onChange = (selected) => {
  if (selected?.value) {
    const value: SearchResult = selected?.value
    let url = `/error/${value.display}`
    if ("gene" in value) {
      url = `/gene/${value.gene}`
    } else if ("pheno" in value) {
      url = `/pheno/${value.pheno}`
    } else if ("variant" in value) {
      url = `/variant/${value.variant}`
    }
    window.location.href = url
  }
}

const reshapeResult = (formatter) => (result : SearchResult) => { return { label : formatter(result.display) , value : result } }

export const checkXChromsome = (query : string) => {
     const pattern =  /^(x|X):/;
     return pattern.test(query);
}

export const xFormatter = (query : string) => query.replace(/^23:/,"X:");
export const identityFormatter = (x : string) => x;
export const resultFormatter = (query : string) => checkXChromsome(query)?xFormatter:identityFormatter;


export const queryFormatter = (query : string) => query.replace(/^(x|X):/,"23:");
const loadOptions = (query: string,callBack) => {
  console.log(checkXChromsome(query));
  const formatter = resultFormatter(query);
  getAutocomplete(queryFormatter(query),(results : SearchResult[])=> callBack(results.map(reshapeResult(formatter))))
}
const customStyles = {
  container: provided => ({
    ...provided,
    width: 400
  }),
  control: provided => ({
    ...provided,
    width: 400,
    height: 10
  }),
}
const Search = () => <form className="form-inline">
  <AsyncSelect
    placeholder={'Search for a variant, gene, or phenotype'}
    onChange={onChange}
    loadOptions={loadOptions}
    menuPosition="fixed"
    styles={customStyles}
  />
</form>

export default Search

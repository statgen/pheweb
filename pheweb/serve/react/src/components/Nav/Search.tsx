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

const reshapeResult = (result : SearchResult) => { return { label : result.display , value : result } }

const loadOptions = (query: string,callBack) => {
  getAutocomplete(query,(results : SearchResult[])=> callBack(results.map(reshapeResult)))
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


import React from "react";

const loading:  JSX.Element = <div>... loading ...</div>

export const isLoading = (isLoading : boolean, content: () =>  JSX.Element) :  JSX.Element => {
  if (isLoading) {
    return loading;
  } else {
    return content();
  }
}

export const hasError = (errorMessage : string | null, content:  JSX.Element) :  JSX.Element => {
  if(errorMessage == null){
    return content
  } else {
    return <div><b>Error</b> : {errorMessage}</div>
  }
}
export default loading

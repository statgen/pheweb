import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { GeneContext, GeneState } from "./GeneContext";

interface  Props {  }

const INITIAL_MESSAGE = "Generate gene report"
const GENERATING_MESSAGE = "Generating report..."

enum State { Downloading, Ready , Error }

const clickHandler = (state : State,
                      setState : Dispatch<SetStateAction<State>>,
                      setData : Dispatch<SetStateAction<string>>,
                      gene : string,
                      anchor : HTMLAnchorElement|null) => () => {
  if(state !== State.Downloading && anchor !== null){
    setState(State.Downloading)
    const url = `/api/genereport/${gene}`
    fetch(url).then(response => response.blob()).then((response) => {
      setData(URL.createObjectURL(response))
    }).then(() => { setState(State.Ready)})
      .catch(() => { setState(State.Error)})
  }

}

const label = (state : State) : string => (state === State.Downloading)?GENERATING_MESSAGE:INITIAL_MESSAGE

const downloadClass = (state : State) => {
  let msg : string
  switch(state){
    case State.Downloading:
      msg = "btn disabled";
      break;
    case State.Error:
      msg = "btn enabled";
      break;
    case State.Ready:
      msg = "btn enabled";
      break;
  }
  return msg
}

const GeneDownload = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [state, setState] = useState<State>(State.Ready);
  const [data, setData] = useState<string|null>(null);
  const [anchor, setAnchor] = useState<HTMLAnchorElement|null>(null);

  useEffect(() => {
    if(anchor && data){
      anchor.click();
      setAnchor(null)
    }
    },[data, anchor]);

  return <div className={downloadClass(state)} style={{ display: 'inline-block', paddingLeft: '0px' }}>
    <span onClick={clickHandler(state, setState,setData, gene, anchor)}
          className='dl-link btn-primary btn aligned' role='button'
          >{label(state)}</span>
    <span className='loader aligned'/>
    <a href={data}
       style={{ display : "none"}}
       ref={setAnchor}
       download={`${gene}_genereport.pdf`}>&nbsp</a>
    { (state === State.Error)? <p id="genereport-errorbox" className="errorbox">error</p>  : <></> }
  </div>
}
export default GeneDownload

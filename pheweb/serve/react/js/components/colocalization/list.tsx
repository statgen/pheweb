import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext, ColocalizationState } from '../../contexts/colocalization/ColocalizationContext';
import { CSVLink } from 'react-csv'

interface Props {}

const List = (props : Props) => {
    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    const [stateSelected, setStateSelected]= useState({ selected : [], row : [] });
    useEffect( () => {
        getList();
    }, [parameter]); /* only update on when position is updated */
    
    const [colocalizationList, setList] = useState(null); /* set up hooks for colocalization */

    const getList = () => {
        if(parameter != null && parameter.phenotype != null && parameter.locus != null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}?clpa.gte=0.1&clpa.order=desc`;
	    fetch(url).then(response => response.json()).then((d) => { setList(d.colocalizations); } ).catch(function(error){ alert(error);});
        }
    }

    if(parameter == null) {
        return  (<div />);
    } else if(colocalizationList != null){
	const metadata = [ { title: "source" , accessor: "source2" , label:"Source" },
                     { title: "locus id", accessor: "locus_id1" , label:"Locus ID" },
                     { title: "qlt code", accessor: "phenotype2", label: "QTL Code" },
                     { title: "qlt", accessor: "phenotype2_description", label: "QTL" },
                     { title: "tissue", accessor: "tissue2",
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' '),
			                 label: "Tissue" },
                     { title: "clpp", accessor: "clpp",
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			                 label: "CLPP" },
                     { title: "clpa", accessor: "clpa" ,
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
                       label: "CLPA" }];

  const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
  const headers = columns.map(c => ({ ...c , key: c.accessor }))
  /*
  const getTrProps = (state, rowInfo, column) => { return { onClick: (e) => { const a = state.selected.indexOf(rowInfo.index);
    if (a == -1) { 
      setState({selected: [...state.selected, rowInfo.index]}); 
    }
    const array = state.selected;
    if(a != -1){ 
      array.splice(a, 1);
      setState({selected: array}); 
    }
  } ,
   style: { /*background: state.selected.indexOf(rowInfo.index) != -1 ? '#393740': '#302f36' } 
} 
}; */

const getTrProps = (state, rowInfo, column) => { 
  const s = stateSelected;
  const setS = setStateSelected;
  return { onClick: () => { const a = s.selected.indexOf(rowInfo.index); 
    if (a == -1) {  setS({selected: [...s.selected, rowInfo.index], row: s.row}); }
    const array = state.selected;
    if(a != -1){ 
      array.splice(a, 1);
      setS({selected: array , row: s.row}); 
    }
  } ,
  style: { /* background: s.selected.indexOf(rowInfo.index) != -1 ? '#393740': '#302f36'*/ } } };

        return (<div>
		<ReactTable data={ colocalizationList }
                       columns={ columns }
                       defaultSorted={[{  id: "clpa", desc: true }]}
                       defaultPageSize={10}
                       filterable
                       defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
                       getTrProps={getTrProps}
		            className="-striped -highlight"/>
		<p></p>
		<div className="row">
		   <div className="col-xs-12">
	              <CSVLink 
		               headers={headers}
		               data={ colocalizationList }
		               separator={'\t'}
		               enclosingCharacter={''}
		               filename={`colocalization.tsv`}
		               className="btn btn-primary"
		               target="_blank">Download Table
		      </CSVLink>
		   </div>

		</div>
		</div>);
    } else { return (<div>Loading ... </div>); }
}


export default List

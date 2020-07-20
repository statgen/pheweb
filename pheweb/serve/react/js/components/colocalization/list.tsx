import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext, ColocalizationState } from '../../contexts/colocalization/ColocalizationContext';
import { CSVLink } from 'react-csv'

interface Props {}

const List = (props : Props) => {
  const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
  useEffect( () => {
        getList();
    }, [parameter]); /* only update on when position is updated */

    const [colocalizationList, setList] = useState(null); /* set up hooks for colocalization */

    const getList = () => {
        if(parameter !== null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}?clpa.gte=0.1&clpa.order=desc`;
            fetch(url).then(response => response.json()).then((d) => { setList(d.data.colocalizations); console.log(d.data); } ).catch(function(error){ alert(error);});
        }
    }

    if(parameter == null) {
        return  (<div />);
    } else if(colocalizationList != null){
	const metadata = [ { title: "source" ,
                             accessor: "source2" ,
			     label:"Source" },
                           { title: "locus id",
                             accessor: "locus_id1" ,
			     label:"Locus ID" },
                           { title: "qlt code",
                             accessor: "phenotype2",
			     label: "QTL Code" },
                           { title: "qlt",
                             accessor: "phenotype2_description",
			     label: "QTL" },
                           { title: "tissue",
                             accessor: "tissue2",
                             Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' '),
			     label: "Tissue" },
                           { title: "clpp",
                             accessor: "clpp",
                             Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			     label: "CLPP" },
                           { title: "clpa",
                             accessor: "clpa" ,
                             Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
                             label: "CLPA" }];

        const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
	const headers = columns.map(c => ({ ...c , key: c.accessor }))
        return (<div>
		<ReactTable data={ colocalizationList }
                            columns={ columns }
                            defaultSorted={[{  id: "clpa", desc: true }]}
                            defaultPageSize={10}
                            filterable
		            defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
		            className="-striped -highlight"/>
		<p></p>
		<div className="row">
		   <div className="col-xs-12">
		      <CSVLink headers={headers}
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

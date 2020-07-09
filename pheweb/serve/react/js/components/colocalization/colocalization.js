import React, { useState, useEffect , useContext } from 'react';
import PropTypes from 'prop-types';
import ReactTable from 'react-table';
import { ColocalizationContext } from '../../contexts/colocalization/ColocalizationContext';
import axios from 'axios'
import { CSVLink } from 'react-csv'

const ColocalizationList = (props) => {
    const { position } = useContext(ColocalizationContext);
    useEffect( () => {
        getColocalizationList();
    }, [position]); /* only update on when position is updated */

    const [colocalizationList, setColocalizationList] = useState(null); /* set up hooks for colocalization */

    const getColocalizationList = () => {
        if(position !== null){
	    const url = `/api/colocalization/${position.phenotype}/${position.chromosome}:${position.start}-${position.stop}`;
            axios.get(url).then((d) => { setColocalizationList(d.data.colocalizations); console.log(d.data); } ).catch(function(error){ alert(error);});
        }
    }

    if(position == null) {
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
                             Cell: props => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' '),
			     label: "Tissue" },
                           { title: "clpp",
                             accessor: "clpp",
                             Cell: props => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			     label: "CLPP" },
                           { title: "clpa",
                             accessor: "clpa" ,
                             Cell: props => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
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
		               filename={`colocatoin.tsv`}
		               className="btn btn-primary"
		               target="_blank">Download Table
		      </CSVLink>
		   </div>

		</div>
		</div>);
    } else { return (<div>Loading ... </div>); }
}


ColocalizationList.propTypes = {
    phenotype1: PropTypes.string
}
export default ColocalizationList

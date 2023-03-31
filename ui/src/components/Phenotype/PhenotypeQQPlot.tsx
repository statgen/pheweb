import React, { useContext } from "react";
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import { isLoading } from "../../common/CommonLoading";
import createQQPlot from "./phenotypeQQD3";

const PhenotypeQQPlot = () => {

  const { qq } = useContext<Partial<PhenotypeState>>(PhenotypeContext);

  const content = () => {
    const qqTable =
      <div>
        <table className='column_spacing'>
          <tbody>
          {Object.keys(qq.overall.gc_lambda).sort().reverse().map(perc => <tr key={perc}>
              <td>GC lambda {perc}</td>
            <td>{qq.overall.gc_lambda[perc]}</td>
          </tr>)}
          </tbody>
        </table>
      </div>

    if(qq.by_maf){
      createQQPlot(qq.by_maf)
    } else {
      createQQPlot([{ maf_range: [0, 1], qq: qq.overall.qq, count: qq.overall.count }])
    }
    return <>
      <div style={{ float: 'left' }}>
        <h3>QQ plot</h3>
        <div id='qq_plot_container' style={{ width: '400px' }} />
        {qqTable}
      </div>
    </>;
  }

  return isLoading(qq === null || qq === undefined, content);

}

export default PhenotypeQQPlot;
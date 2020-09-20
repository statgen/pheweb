export const cell_text = (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' ')
export const cell_number = (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2)

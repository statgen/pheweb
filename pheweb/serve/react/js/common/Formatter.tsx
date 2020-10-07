import { Cell } from 'react-table'
import { Variant } from './Model'
import React from 'react'

export const cellText = (props : Cell<{}, string>) : string =>
  (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.valueOf().replace(/_/g, ' ')

export const cellNumber = (props : Cell<{}, Number>) : string =>
  (!props.value) ? 'NA' : Number(props.value.valueOf()).toPrecision(2)

export const variantLink = (variant : Variant | undefined) : JSX.Element => {
  return variant ? <a href={`/variant/${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`}>
    {`${variant.chromosome}:${variant.position}:${variant.reference}:${variant.alternate}`}
                   </a> : <span>NA</span>
}

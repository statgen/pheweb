import {Cell} from "react-table";
import {Variant} from "./Model";
import React from "react";


export const cell_text = (props : Cell<{},string>) =>
    (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.valueOf().replace(/_/g,' ')

export const cell_number = (props : Cell<{},Number>) =>
    (!props.value) ? 'NA' : Number(props.value.valueOf()).toPrecision(2)

export const variant_link = (variant : Variant | undefined) : JSX.Element=> {
    return variant?<a href={ `/variant/${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`}>
        { `${variant.chromosome}:${variant.position}:${variant.reference}:${variant.alternate}` }
    </a>:<span>NA</span>;
}

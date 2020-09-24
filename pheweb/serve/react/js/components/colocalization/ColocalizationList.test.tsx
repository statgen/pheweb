/* eslint-env jest */

import {Cell} from "react-table";
import {Colocalization} from "../../common/Model";
import {ColocalizationParameter, createParameter} from "./ColocalizationContext";
import {cell_locus_id1, cell_variant1} from "./ColocalizationList";

test('locus id1', () => {
    const locus_id1 = "test";
    const cell : Cell<Colocalization> = { row : { original : { locus_id1 } } } as Cell<Colocalization>;
    expect(cell_locus_id1(cell)).toBe(locus_id1)
});

test('variant1 cell', () => {
    const variants_1 = "test";
    const cell : Cell<Colocalization> = { row : { original : { variants_1 } } } as Cell<Colocalization>;
    expect(cell_variant1(cell)).toBe(variants_1)
});
const locus_id1_cell = (cell : Cell<Colocalization>) => cell.row.original.locus_id1
const variant1_cell = (cell : Cell<Colocalization>) => cell.row.original.variants_1

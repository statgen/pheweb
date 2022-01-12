import { addLambda, Phenotype } from "./indexModel";
import { Region } from "../Region/RegionModel";
import { get } from "../../common/Utilities";

export const getPhenotypes = (sink: (s: Phenotype[]) => void,
                       getURL = get) => get("/api/phenos", (p : Phenotype[]) => sink(p.map(addLambda)))

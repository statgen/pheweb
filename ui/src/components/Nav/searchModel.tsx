export interface GenericSearchResult {
  display : string
}

export interface GeneSearchResult extends GenericSearchResult{
  gene : string
}

export interface PhenotypeSearchResult extends GenericSearchResult{
  pheno : string
}

export interface VariantSearchResult extends GenericSearchResult{
  variant : string
}

export type SearchResult = GeneSearchResult | PhenotypeSearchResult | VariantSearchResult
DROP TABLE IF EXISTS pheweb.results;
DROP TABLE IF EXISTS pheweb.variants;
DROP TABLE IF EXISTS pheweb.phenos;
DROP TABLE IF EXISTS pheweb.categories;

CREATE TABLE pheweb.categories (
  id BIGSERIAL,
  name TEXT NOT NULL,
  css_color TEXT NOT NULL,
  CONSTRAINT category_pkey PRIMARY KEY (id)
);

CREATE TABLE pheweb.phenos (
  id BIGSERIAL,
  category_id BIGINT NOT NULL,
  icd9_info JSONB NOT NULL,
  phewas_code TEXT NOT NULL,
  phewas_string TEXT NOT NULL,
  num_cases INTEGER NOT NULL,
  num_controls INTEGER NOT NULL,
  CONSTRAINT pheno_pkey PRIMARY KEY (id),
  CONSTRAINT pheno_category_fkey FOREIGN KEY (category_id) REFERENCES pheweb.categories(id)
);

CREATE TABLE pheweb.variants (
  id  BIGSERIAL,
  chromosome TEXT NOT NULL,
  position BIGINT NOT NULL,
  ref TEXT NOT NULL,
  alt TEXT NOT NULL,
  name TEXT NOT NULL, -- eg, "10:123456789 A>G", for search
  rsids JSONB NOT NULL,
  CONSTRAINT variant_pkey PRIMARY KEY (id)
);

CREATE TABLE pheweb.results (
  id BIGSERIAL,
  variant_id BIGINT NOT NULL,
  pheno_id BIGINT NOT NULL,
  odds_ratio REAL,
  beta REAL,
  sebeta REAL,
  maf REAL,
  pval DOUBLE PRECISION NOT NULL,
  CONSTRAINT result_pkey PRIMARY KEY (id),
  CONSTRAINT result_variant_fkey FOREIGN KEY (variant_id) REFERENCES pheweb.variants(id),
  CONSTRAINT result_pheno_fkey FOREIGN KEY (pheno_id) REFERENCES pheweb.phenos(id)
  -- Do we want chisq or af_case? Would they be useful?  Private?
);

-- Later:
-- CREATE INDEX idx_variant_rsids_gin ON pheweb.variant USING GIN (rsids jsonb_path_ops);
-- SELECT * FROM pheweb.variant WHERE rsids @> %(rsid);
-- or maybe: SELECT * FROM pheweb.variants WHERE rsids ? %(rsid);
-- CREATE INDEX idx_result_variantid_gin ON pheweb.result USING GIN (variant_id);
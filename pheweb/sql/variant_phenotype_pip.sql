-- drop table variant_phenotype_pip;
create table variant_phenotype_pip(
phenocode                 VARCHAR(255) NOT NULL,
chromosome                TINYINT NOT NULL,
position                  INT NOT NULL,
identitier                varchar(2000) NOT NULL,
reference                 varchar(1000) NOT NULL,
alternate                 varchar(1000) NOT NULL,
pip                       FLOAT NOT NULL,
CHECK (chromosome >= 1 and chromosome < 27),
CHECK (pip >= 0 and pip <= 1)
);

CREATE INDEX variant_phenotype_pip_phenocode ON variant_phenotype_pip (phenocode);
CREATE INDEX variant_phenotype_pip_cpra      ON variant_phenotype_pip (chromosome,position,reference(511),alternate(511));

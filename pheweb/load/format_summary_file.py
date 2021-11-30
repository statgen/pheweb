#!/usr/bin/env python3
#
# Created by majorseitan@gmail.com at 30/11/2021
# Feature :  format summary file #174
# Pheweb expects summary files to follow
#
# the following tsv fields are required
# chromosome position reference alternative pvalue mlogp beta
# the fields following these are free form.
#
# with the headers being
# #chrom pos ref alt pval mlogp beta
#
# chromosome : where chromosome is a number between 1-25
# position : the position is an positive integer
# reference : a string [GATC]+
# alternative : a string [GACT]+
# pvalue : float : [0 - 1]
# mlogp : float : -inf - sentinel
# beta : float
#
# command line interface
#
# format-summary-file
# -chrom [NAME] OPTIONAL : name of chromosome column defaults to first column
# -pos [NAME] OPTIONAL : name of position column defaults to second column
# -ref [NAME] OPTIONAL : name of reference column defaults to third column
# -alt [NAME] OPTIONAL : name of alternate column defaults to fourth column
# -pval [NAME] OPTIONAL : name of p-value column  defaults to fifth column
# -mlogp [NAME] OPTIONAL : name of m-logp column checks 6 column
# -beta [name] OPTIONAL : name of beta columns column after mlogp or pvalue
# -exclude [NAME,...] OPTIONAL : comma separated list of columns to exclude
# -rename [OLD_NAME:NEW_NAME,...] OPTIONAL : comma separated list of columns to rename
# -file [path | - ] OPTIONAL : path of output or stdout if '-' is supplied defaults to stdout
# -log [path | - ] OPTIONAL : path of output or stdout if '-' is supplied defaults to stdout
#
# Behavior
#
# file data will be read from the file and the output.
# the output columns will be formatted and renamed in
# the convention that phweb expects.  Header errors will
# result in termination with an error code. Errors will be
# logged for each offending column an error code returned
# upon exit with a summary printed to standard error.
#
import sys
import os
from typing import List


def run(argv: List[str]) -> int:
    """
    Takes arguments and returns
    an exit code.

    @param argv: command line arguments
    @return: exit code
    """
    return os.EX_OK


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))

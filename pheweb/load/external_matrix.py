#!/usr/bin/env python3

import sys
import os
import glob
import pysam
import argparse
import gzip
import subprocess
import time

chrord = {"chr" + str(chr): int(chr) for chr in list(range(1, 26))}
chrord["X"] = 23
chrord["chrX"] = 23
chrord["Y"] = 24
chrord["chrY"] = 24
chrord["MT"] = 25
chrord["chrMT"] = 25

chrord.update({str(chr): int(chr) for chr in list(range(1, 26))})


def scroll_to_current(variant, phenodat):
    f = phenodat["fpoint"]

    if (len(phenodat["cur_lines"]) > 0 and (
            chrord[phenodat["cur_lines"][0][0]] != chrord[variant[0]] or phenodat["cur_lines"][0][1] != variant[1])):
        phenodat["cur_lines"].clear()

    while (True):
        dat = None
        if (phenodat["future"] is None):
            l = f.readline()
            if (l != ""):
                l = l.rstrip("\n").split("\t")
                dat = [l[i] for i in phenodat["cpra_ind"] + phenodat["other_i"]]
                dat[1] = int(dat[1])
        else:
            dat = phenodat["future"]
            phenodat["future"] = None

        if (dat is not None):
            if (len(dat[0].split("_")) > 1):
                ## skip alternate contigs from results for now as they don't exist in in FG and are not in predictable order in UKBB liftov er results
                continue
            if (dat[0] == variant[0] and dat[1] == variant[1]):
                phenodat["cur_lines"].append(dat)
            elif chrord[dat[0]] > chrord[variant[0]] or (chrord[dat[0]] == chrord[variant[0]] and dat[1] > variant[1]):
                phenodat["future"] = dat
                break
        else:
            break


def rename(field, rename_fields):
    if field in rename_fields:
        return rename_fields[field]
    else:
        return field


def fields_add_arguments(parser):
    parser.add_argument('--all_fields',
                        dest="all_fields",
                        action='store_true',
                        help="use all headers from file")

    parser.add_argument('--rename_fields',
                        nargs='*',
                        default=[],
                        action='store',
                        type=str,
                        help='rename fields : new_name_1 old_name_1 new_name_2 old_name_2 ...')

    parser.add_argument('--exclude_fields',
                        nargs='*',
                        default=[],
                        action='store',
                        type=str,
                        help='comma exclude fields : name1 name2 ...')
    return parser


def handle_all_fields(config_file, CPRA_fields):
    result_header = None
    with open(config_file, 'r') as conf:
        for line in conf:
            line = line.rstrip("\n").split("\t")
            op = gzip.open if (line[4].endswith(".gz")) else open
            resf = op(line[4], 'rt')
            current_header = resf.readline().rstrip("\n").split("\t")
            if result_header is None:
                result_header = current_header
            elif result_header is not None and not set(result_header) == set(current_header):
                raise Exception(
                    " current file '" + line[4] + "' has header : " + str(current_header) + " expected " + str(
                        result_header))
    if result_header is None:
        return []
    else:
        return [f.strip() for f in result_header if f.strip().lower() not in {f.lower() for f in CPRA_fields}]


def handle_exclude_fields(exclude_fields, supp_fields):
    exclude = set()
    for e in exclude_fields:
        exclude.update(e.strip().lower().split(','))
    supp_fields = [f.strip() for f in supp_fields if not f.strip().lower() in exclude]
    return supp_fields

def handle_rename_fields(rename_fields):
    for f in rename_fields.split(","):
        if ":" in f:
            k, v = f.strip().split(":")
            rename_fields[k] = v
        else:
            raise Exception("Badly formed rename : '" + f + "'")


def run():
    '''
        This module generates matrix from external single association results for fast access to browsingself.
        First parameter should be a path to configuration file with 5 colums(no header):
            1: phenotype name which matches FINNGEN phenotypes
            2: free form phenotype text
            3:  N_cases
            4:  n_controls
            5: path to result file with columns: chr,pos,ref,alt,beta,p-value + any addional columns
        Second parameter should be a path to (empty/not existing) directory where the data should be stored
        Third parameter should be file with common sites in format chr:pos:ref:alt one per line and in the
        same order as in the result files.
    '''

    parser = argparse.ArgumentParser(description="Create tabixed big matrix for external results")
    parser.add_argument('config_file', action='store', type=str, help='Configuration file ')
    parser.add_argument('path_to_res', action='store', type=str, help='Prefix filepath where the results will be saved')
    parser.add_argument('common_sites', action='store', type=str,
                        help='common sites in the files. need to be in chr pos order')
    parser.add_argument('--chr', default="chr", action='store', type=str, help='chr column name in result files')
    parser.add_argument('--pos', default="pos", action='store', type=str, help='pos column name in result files')
    parser.add_argument('--ref', default="ref", action='store', type=str, help='ref column name in result files')
    parser.add_argument('--alt', default="alt", action='store', type=str, help='alt column name in result files')
    parser.add_argument('--other_fields', action='store', type=str,
                        help='comma separated list of other column names in result files')
    parser.add_argument('--no_require_match', dest="require_match", action='store_false',
                        help='if given, dont require a variant to match between the sites and pheno files for it to be written')
    parser.add_argument('--no_tabix', dest="tabix", action='store_false',
                        help='if given, will not bgzip and tabix the result file')
    parser = fields_add_arguments(parser)

    args = parser.parse_args()

    phenos = []

    CPRA_fields = [args.chr, args.pos, args.ref, args.alt]

    supp_fields = []

    rename_fields = {}

    if (args.other_fields):
        supp_fields = [f.strip() for f in args.other_fields.split(",")]

    # use all fields from header
    if (args.all_fields):
        supp_fields.extend(handle_all_fields(args.config_file, CPRA_fields))
    elif not args.other_fields:
        # force user to supply additional columns
        # otherwise you end up with just chr, pos, ref, alt
        msg = """
        Please provide additional columns by either

        by supplying a list of fields:

            --other_fields [list of fields]

        or indicating all fields should be used:

           --all_fields

        """
        raise ValueError(msg)

    # exclude fields
    if (args.exclude_fields):
        supp_fields = handle_exclude_fields(args.exclude_fields, supp_fields)

    # rename fields when output

    if (args.rename_fields):
        rename_fields = handle_rename_fields(args.rename_fields)

    req_fields = list(CPRA_fields)
    req_fields.extend(supp_fields)

    with open(args.path_to_res + "matrix.tsv", "w") as out:
        with open(args.config_file, 'r') as conf:
            out.write("\t".join(["#chr", "pos", "ref", "alt"]))
            for line in conf:
                line = line.rstrip("\n").split("\t")
                op = gzip.open if (line[4].endswith(".gz")) else open

                resf = op(line[4], 'rt')
                header = resf.readline().rstrip("\n").split("\t")
                if not all([r in header for r in req_fields]):
                    raise Exception(
                        "All requested columns ( " + ",".join(req_fields) + ") does not exist in file:" + line[4])

                phenos.append({"phenoid": line[0], "phenotext": line[1],
                               "ncases": line[2], "ncontrol": line[3], "filename": line[4], "fpoint": resf,
                               "cpra_ind": [header.index(f) for f in CPRA_fields],
                               "other_i": [header.index(f) for f in supp_fields],
                               "cur_lines": [], "future": None})

                out.write("\t" + "\t".join([rename(s, rename_fields) + "@" + line[0] for s in supp_fields]))

        out.write("\n")

        vars_processed = 0
        start = time.time()
        last = time.time()
        with open(args.common_sites) as common:
            smallestpos = None
            for v in common:

                vars_processed += 1

                if (vars_processed % 1000 == 0):
                    elapsed = time.time() - start

                    sincelast = time.time() - last
                    last = time.time()
                    print("{} processed {} variants per second. Average speed {} / second".format(vars_processed,
                                                                                                  1000 / sincelast,
                                                                                                  vars_processed / elapsed))
                linedat = []
                anymatch = False
                varid = v.rstrip("\n").split("\t")
                if (len(varid) < 4):
                    raise Exception("Less than 4 columns in common sites row " + v)
                linedat.extend(varid[0:4])
                varid[1] = int(varid[1])

                if (smallestpos is not None and (smallestpos[0] > chrord[varid[0]] or (
                        varid[1] == smallestpos[1] and varid[1] < smallestpos[1]))):
                    # have not reached the smallest result so write NA row and keep on scrolling variants
                    linedat.extend(["NA"] * len(supp_fields) * len(phenos))
                else:
                    for p in phenos:
                        smallestpos = None
                        resf = p["fpoint"]

                        scroll_to_current(varid, p)

                        sm_pos = p["cur_lines"][0] if len(p["cur_lines"]) > 0 else p["future"]

                        if (sm_pos is not None and (smallestpos is None or chrord[sm_pos[0]] < smallestpos[0] or
                                                    (chrord[sm_pos[0]] == smallestpos[0] and sm_pos[1] < smallestpos[
                                                        1]))):
                            smallestpos = (chrord[sm_pos[0]], sm_pos[1])

                        match_idx = [i for i, v in enumerate(p["cur_lines"]) if
                                     all([varid[j] == v[j] for j in [0, 1, 2, 3]])]

                        if len(match_idx) == 0:
                            ## not matching.... write blanks,
                            linedat.extend(["NA"] * len(supp_fields))
                        else:
                            anymatch = True
                            linedat.extend(p["cur_lines"][match_idx[0]][4:])
                            del p["cur_lines"][match_idx[0]]
                if (not args.require_match or anymatch):
                    out.write("\t".join(linedat) + "\n")
                linedat.clear()

    if args.tabix:
        subprocess.check_call(["bgzip", args.path_to_res + "matrix.tsv"])
        subprocess.check_call(["tabix", "-s 1", "-e 2", "-b 2", args.path_to_res + "matrix.tsv.gz"])


if __name__ == "__main__":
    run()

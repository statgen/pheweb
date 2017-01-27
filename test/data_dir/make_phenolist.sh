#!/bin/bash
{
set -euo pipefail
set -x

p='pheweb phenolist'

$p glob-files ../input_files/*
$p extract-phenocode-from-fname --simple
#$p extract-phenocode-from-fname '/([^/]*)$'
$p read-info-from-association-files
$p hide-small-numbers-of-samples --minimum-visible-number 50
$p filter-phenotypes --minimum-num-cases 20 --minimum-num-controls 20 --minimum-num-samples 20
$p verify
}

# Created by mwm1 at 12/22/21

# Feature: #Enter feature name here
# Enter feature description here

# Scenario: # Enter scenario name here
# Enter steps here
# Created by mwm1 at 12/21/21

import functools
import typing
from dataclasses import dataclass

import pandas as pd
from smart_open import open

from .dao import ChipData, ChipDAO


@functools.lru_cache()
def fetch_chip_data(chip_data: str) -> ChipData:
    with open(chip_data, 'rb') as file:
        df = pd.read_csv(file, encoding='utf8', sep='\t').fillna('NA')
        # replace all . values with NA
        df = df.replace(r'^\.$', 'NA', regex=True)
        # find minimun p-value for each variant
        df['is_top'] = 0
        df.loc[df.groupby('variant')['pval'].idxmin(axis=0), 'is_top'] = 1
        data = ChipData(columns=df.columns.tolist(),
                        data=df.to_dict(orient='records'))
        return data


@functools.lru_cache()
def read_path(path: str) -> typing.Optional[bytes]:
    with open(path, 'rb') as file:
        result = file.read()
    return result


def normalize_variant(variant: str) -> str:
    cpra = variant.split(':')
    cpra[0] = 'X' if cpra[0] == '23' else cpra[0]
    return '_'.join(cpra)


def format_path(plot_root: str, variant: str) -> str:
    return f'{plot_root}{variant}.png'


@functools.lru_cache()
def fetch_cluster_plot(plot_root: str, variant: str) -> typing.Optional[bytes]:
    variant = normalize_variant(variant)
    path = format_path(plot_root, variant)
    return read_path(path)


@dataclass
class FileChipDAO(ChipDAO):
    chip_data: str
    plot_root: str
    verbose: str = False

    def get_chip_data(self) -> ChipData:
        return fetch_chip_data(self.chip_data)

    def get_cluster_plot(self, variant_str: str) -> typing.Optional[bytes]:
        return fetch_cluster_plot(self.plot_root, variant_str)

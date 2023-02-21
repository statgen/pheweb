# -*- coding: utf-8 -*-
"""
FS storage implementation of chip data storage.

Unit test coverage for fs storage.
"""

import functools
import typing
from dataclasses import dataclass

import pandas as pd
from smart_open import open as smart_open

from pheweb.serve.components.chip.model import ChipData, ChipDAO


@functools.lru_cache()
def fetch_chip_data(chip_data_path: str) -> ChipData:
    """
    Fetch chip data.

    :param chip_data_path: chip data path
    :return: chip data
    """
    with smart_open(chip_data_path, "rb") as file:
        data_frame = pd.read_csv(file, encoding="utf8", sep="\t").fillna("NA")
        # replace all . values with NA
        data_frame = data_frame.replace(r"^\.$", "NA", regex=True)
        # find minimun p-value for each variant
        data_frame["is_top"] = 0
        data_frame.loc[
            data_frame.groupby("variant")["pval"].idxmin(axis=0), "is_top"
        ] = 1
        data = ChipData(
            columns=data_frame.columns.tolist(),
            data=data_frame.to_dict(orient="records"),
        )
        return data


@functools.lru_cache()
def read_path(path: str) -> typing.Optional[bytes]:
    """
    Read path.

    Given a path return the bytes
    associated with the path.

    :param path: path to fetch
    :return: bytes or None
    """
    try:
        with smart_open(path, "rb") as file:
            result = file.read()
    except FileNotFoundError:
        result = None
    return result


def normalize_variant(variant: str) -> str:
    """
    Normalize variant.

    Reformat variant replace colons as separators
    to underscore.

    chromosome:position:reference:alternative
    to
    chromosome_position_reference_alternative

    :param variant: string representation of variant
    :return: reformatted variant
    """
    cpra = variant.split(":")
    cpra[0] = "X" if cpra[0] == "23" else cpra[0]
    return "_".join(cpra)


def format_path(plot_root: str, variant: str) -> str:
    """
    Format path.

    Convert representation of variant to
    a path.

    :param plot_root: root path can be url
    :param variant: variant
    :return: path of variant resource
    """
    return f"{plot_root}{variant}.png"


@functools.lru_cache()
def fetch_cluster_plot(plot_root: str, variant: str) -> typing.Optional[bytes]:
    """
    Fetch cluster plot.

    :param plot_root: root (directory) of plots
    :param variant: variant
    :return: plot if there is one
    """
    variant = normalize_variant(variant)
    path = format_path(plot_root, variant)
    return read_path(path)


@dataclass
class FileChipDAO(ChipDAO):
    """
    File chip data dao.

    A file based chip data dao that returns.

    chip_data: path to chip data
    plot_root: path to root (directory) of plot files
    """

    chip_data: str
    plot_root: str

    def get_chip_data(self) -> ChipData:
        """
        Get chip data.

        :return: Chip data
        """
        return fetch_chip_data(self.chip_data)

    def get_cluster_plot(self, variant: str) -> typing.Optional[bytes]:
        """
        Get cluster plot.

        Given a variant return bytes of the cluster plot.

        :param variant: variant to get plot for
        :return: plot if available None otherwise
        """
        return fetch_cluster_plot(self.plot_root, variant)

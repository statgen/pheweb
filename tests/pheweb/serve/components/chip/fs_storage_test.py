# -*- coding: utf-8 -*-
"""
FS storage test.

Unit test for fs storage.
"""
import hashlib
import os
import random
import typing
import uuid
from unittest.mock import patch

from pheweb.serve.components.chip.fs_storage import (
    format_path,
    normalize_variant,
    fetch_chip_data,
    read_path,
    fetch_cluster_plot,
    FileChipDAO,
)
from pheweb.serve.components.chip.model import ChipData

PLOT_ROOT_DIRECTORY: str = os.path.dirname(os.path.abspath(__file__))
CHIP_CODING_FILE: str = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "chip_coding.tsv"
)


def test_fetch_chip_data() -> None:
    """
    Test fetch chip data.

    :return: None
    """
    
    expected = ChipData(
        columns=[
            "variant",
            "pval",
            "beta",
            "sebeta",
            "af_alt",
            "af_alt_cases",
            "af_alt_controls",
            "rsid",
            "gene_most_severe",
            "most_severe",
            "enrichment_nfsee",
            "fin_AF",
            "nfsee_AF",
            "pheno",
            "HW_exact_p_value",
            "missing_proportion",
            "INFO_sisu4",
            "het_ex_ch",
            "LONGNAME",
            "FET_p",
            "pval_imp",
            "is_top",
        ],
        data=[
            {
                "variant": "1:1:A:C",
                "pval": 0.1,
                "beta": 0.1,
                "sebeta": 0.2,
                "af_alt": 0.3,
                "af_alt_cases": 0.4,
                "af_alt_controls": 0.5,
                "rsid": "rs6",
                "gene_most_severe": "AA",
                "most_severe": "missense_variant",
                "enrichment_nfsee": 0.7,
                "fin_AF": 0.0008,
                "nfsee_AF": 0.9,
                "pheno": "PHENO",
                "HW_exact_p_value": 0.11,
                "missing_proportion": 0.12,
                "INFO_sisu4": 0.13,
                "het_ex_ch": "14/15/16",
                "LONGNAME": "PHENO",
                "FET_p": 0.17,
                "pval_imp": 1.0e-40,
                "is_top": 1,
            }
        ],
    )
    assert fetch_chip_data(CHIP_CODING_FILE) == expected


def test_read_path() -> None:
    """
    Test read path.

    :return: None
    """
    file_bytes: bytes = read_path(CHIP_CODING_FILE)
    assert hashlib.md5(file_bytes).hexdigest() == "41c8388a9e4d481606b9d819bc4f51b3"


def test_read_path_bad_path() -> None:
    """
    Test read path when bad.

    Make sure function returns None when
    file cannot be found.

    :return: None
    """
    path = str(uuid.uuid4())
    assert read_path(path) is None


def test_normalize_variant() -> None:
    """
    Test normalize variant.

    :return: None
    """
    assert normalize_variant("1:1:A:C") == "1_1_A_C"


def test_format_path() -> None:
    """
    Test format path.

    :return: None
    """
    assert format_path("root_", "variant") == "root_variant.png"


# https://stackoverflow.com/questions/5495492/random-byte-string-in-python
def random_bytes(size: int) -> bytes:
    """
    Random bytes.

    :param size: number of random bytes
    :return: size random bytes
    """
    return bytes([random.randrange(0, 256) for _ in range(0, size)])


@patch(
    "pheweb.serve.components.chip.fs_storage.read_path", return_value=random_bytes(100)
)
def test_fetch_cluster_plot(mock_read_path: typing.Any) -> None:
    """
    Test fetch cluster plot.

    :param mock_read_path: mock of read path.
    :return: None
    """
    plot_root = str(uuid.uuid4())
    variant = str(uuid.uuid4())
    assert not mock_read_path.called
    assert fetch_cluster_plot(plot_root, variant) == mock_read_path.return_value
    path = mock_read_path.call_args[0][0]
    assert plot_root in path
    assert variant in path
    mock_read_path.assert_called_once()


@patch(
    "pheweb.serve.components.chip.fs_storage.fetch_chip_data",
    return_value=random_bytes(100),
)
def test_file_chip_dao_get_chip_data(mock_fetch_chip_data) -> None:
    """
    Test file chip do can get chip data.

    :param mock_fetch_chip_data: mock of fetch chip data.
    :return: None
    """
    plot_root = str(uuid.uuid4())
    chip_data = str(uuid.uuid4())
    assert not mock_fetch_chip_data.called
    dao = FileChipDAO(plot_root=plot_root, chip_data=chip_data)
    assert dao.get_chip_data() == mock_fetch_chip_data.return_value
    mock_fetch_chip_data.assert_called_once()
    assert mock_fetch_chip_data.call_args[0][0] == chip_data


@patch(
    "pheweb.serve.components.chip.fs_storage.fetch_cluster_plot",
    return_value=random_bytes(100),
)
def test_file_chip_dao_get_cluster_plot(mock_fetch_cluster_plot: typing.Any) -> None:
    """
    Test file chip do can get cluster.

    :param mock_fetch_cluster_plot: mock of fetch cluster plot
    :return: None
    """
    plot_root = str(uuid.uuid4())
    chip_data = str(uuid.uuid4())
    variant = str(uuid.uuid4())
    assert not mock_fetch_cluster_plot.called
    dao = FileChipDAO(plot_root=plot_root, chip_data=chip_data)
    assert dao.get_cluster_plot(variant) == mock_fetch_cluster_plot.return_value
    mock_fetch_cluster_plot.assert_called_once()
    assert mock_fetch_cluster_plot.call_args[0][0] == plot_root
    assert mock_fetch_cluster_plot.call_args[0][1] == variant

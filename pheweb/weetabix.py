"""
Given a delimited flat text file, with a specified "key" column, generate an index specifying where to find
    rows with a given value

This is useful for, eg, looking up all information associated with a given phenotype ID

# TODO: I should probably be embarrassed by this. Daniel can shame me later.
"""

import os
import pickle
from typing import List,Optional,Dict


def _index_name(filename:str) -> str:
    # TODO: Replace pickle with another storage mechanism
    return '{}.pickle'.format(filename)


def make_byte_index(filename: str, key_col: int,
                    skip_lines: int = 1, delimiter: str = '\t',
                    index_fn: Optional[str] = None) -> str:
    """
    Generate a crude index specifying byte ranges of lines where each value can be found
    :param filename: The file to index
    :param key_col: The column to use as index values (starts at 1)
    :param skip_lines: Number of headers/other lines to skip
    :param delimiter: The character used to separate fields
    :param index_fn: (optional) path to the index file
    :return:
    """
    byte_index:Dict[str,List[int]] = {}

    with open(filename, 'r') as f:
        for r in range(skip_lines):
            f.readline()

        span_start = last_line_end = f.tell()
        line = f.readline()
        last_key = line.split(delimiter)[key_col - 1]
        while line:  # workaround for python for-loop "telling position disabled by next() call" message
            fields = line.split(delimiter)
            key = fields[key_col - 1]
            position = f.tell()

            if key != last_key:
                byte_index[last_key] = [span_start, last_line_end]
                span_start = last_line_end

            # Advance the iteration
            last_key = key
            last_line_end = position
            line = f.readline()

        if last_key not in byte_index:
            # In case file has no newline at end
            byte_index[last_key] = [span_start, last_line_end]

    index_fn = index_fn or _index_name(filename)
    with open(index_fn, 'wb') as pickle_f:
        pickle.dump(byte_index, pickle_f)

    return index_fn


def get_indexed_rows(filename: str, key: str,
                     strict: bool = False, index_fn: Optional[str] = None) -> List[str]:
    """
    Fetch all lines that reference the specified key, from a previously indexed file
    :param filename: The filename to search
    :param key: The value to be read. If the specified value was not in the target file, raises a KeyError.
    :param strict: Whether to require that the value is present in the file.
    :param index_fn: (optional) path to the index file
    :return: An array of strings, one per line of file
    """
    index_fn = index_fn or _index_name(filename)
    if not os.path.isfile(index_fn):
        raise FileNotFoundError()

    with open(index_fn, 'rb') as pickle_f:
        byte_index = pickle.load(pickle_f)

    if key not in byte_index and not strict:
        # Sometimes the file may not have any information about the user's query, and that is usually ok
        return []

    start, end = byte_index[key]

    with open(filename, 'r') as f:
        # TODO: Improve this to support for big file ranges
        f.seek(start, 0)
        return f.read(end - start).splitlines()

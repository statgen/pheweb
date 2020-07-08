from typing import Tuple, Optional
import re


def parse_range(text: str) -> Optional[Tuple[int,int,int]]:
    """
    Takes a string representing a range and returns a tuple of integers
    (chromosome,start,stop).  Returns None if it cannot be parsed.
    """
    fragments = re.match(r'(?P<chromosome>\d+):(?P<start>\d+)-(?P<stop>\d+)', text)
    if fragments is None:
        (int(fragments['chromosome']),
         int(fragments['start']),
         int(fragments['stop']))
    else:
        None

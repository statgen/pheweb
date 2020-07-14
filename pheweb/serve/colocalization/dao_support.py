import typing
from sqlalchemy import func, distinct, select
#from ..data_access.db import *
import attr
from attr.validators import instance_of


class DAOSupport:
    """
    Class to support dao using sql alchemy
    """

    def __init__(self, clazz):
        self.clazz = clazz

    def create_filter(self, query, flags: typing.Dict[str, str] = dict()):
        """
        a query dsl using a dictionary of fields with extensions and values

        e.g. the dictionary entry

        size.lt,2 would correspond to the predicate s < 2

        below are the specification for other predicates
        field : field is equal to value
        .offset : start query at the offset
        .limit : limit query results
        field.lt : field > value
        field.gt : field < value
        field.lte : field <= value
        field.gte : field >= value
        field.like : field like value
        field.order = {asc,desc} : order by field {desc,asc}

        :param query:
        :param flags:
        :return:
        """
        warnings = []
        filters = []
        order_by = []
        limit = None
        offset = None
        for k, v in flags.items():
            if "." in k:
                prefix, suffix = k.split(".")
                column = getattr(self.clazz, prefix, None)
                if not isinstance(v, int):
                    try:
                        int_value = int(v)
                    except ValueError:
                        int_value = None
                        
                    try:
                        int_value = float(v) if int_value is None else int_value
                    except ValueError:
                        int_value = None
                else:
                    int_value = v

                if suffix == "offset" and int_value is not None:
                    offset = int_value
                elif suffix == "limit" and int_value is not None:
                    limit = int_value
                elif suffix == "lt" and column is not None and int_value is not None:
                    filters.append(column < int_value)
                elif suffix == "gt" and column is not None and int_value is not None:
                    filters.append(column > int_value)
                elif suffix == "lte" and column is not None and int_value is not None:
                    filters.append(column <= int_value)
                elif suffix == "gte" and column is not None and int_value is not None:
                    filters.append(column >= int_value)
                elif suffix == "like" and column is not None:
                    filters.append(column.like(v))
                elif suffix == "order" and v == "asc" and column is not None:
                    order_by.append(column.asc())
                elif suffix == "order" and v == "desc" and column is not None:
                    order_by.append(column.desc())
                else:
                    msg  = "could not process : "
                    msg += "key: '{k}' , value: '{v}' column: '{c}' "
                    msg += "int_value: '{i}' "
                    warnings.append(msg.format(k=k,
                                               v=v,
                                               c=column,
                                               i=int_value))
            else:
                column = getattr(self.clazz, k, None)
                if column is None:
                    warnings.append("could not process '{k}'")
                else:
                    filters.append(column == v)
        query = query.filter(*filters)
        query = query.order_by(*order_by)
        if limit is not None:
            query = query.limit(limit)
        if offset is not None:
            query = query.offset(limit)
        print(query)
        return warnings, query

    def create_aggregates(self, fields: typing.List[str]):
        # .count
        # field.distinct
        # field.min
        # field.max
        # field.avg
        # field.sum
        projections = []
        warnings = []
        for field in fields:
            if "." in field:
                prefix, suffix = field.split(".")
                column = getattr(self.clazz, prefix, None)
                if suffix == "count":
                    projections.append(func.count())
                elif suffix == "distinct" and column is not None:
                    projections.append(func.count(distinct(column)))
                elif suffix == "max" and column is not None:
                    projections.append(func.max(column))
                elif suffix == "min" and column is not None:
                    projections.append(func.min(column))
                elif suffix == "sum" and column is not None:
                    projections.append(func.sum(column))
                else:
                    warnings.append("could not process '{field}'".format(field=field))
            else:
                warnings.append("could not process '{field}'".format(field=field))
        return warnings, projections

    def query_summary(self, session, flags: typing.Dict[str, typing.Any], fields: typing.List[str]):
        if not fields:
            return ["no columns provided"], []
        elif fields == [".count"]:
            query = select([func.count()]).select_from(self.clazz)
            return [], [session.query(query).scalar()]
        else:
            warnings1, projections = self.create_aggregates(fields)
            warnings2, query = self.create_filter(session.query(*projections), flags)
            warnings = (warnings1 + warnings2)
            print(warnings)
            return warnings, [x for x in query.first()]

    X = typing.TypeVar('X')
    Y = typing.TypeVar('Y')

    def query_matches(self,
                      session,
                      flags: typing.Dict[str, typing.Any] = dict(),
                      f: typing.Callable[[X], Y] = lambda x: x) -> typing.List[Y]:
        warnings, query = self.create_filter(session.query(self.clazz), flags)
        print(warnings)
        print(query)
        return [f(r) for r in query.all()]

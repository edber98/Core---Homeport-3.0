#!/usr/bin/env python3
"""CSV manipulation via pandas: filter, select, rename, aggregate, join, sort, dedup, convert.

Spec (stdin): see SKILL.md.
Output: /workspace/out/<slug>.(csv|xlsx)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_input,
)

try:
    import pandas as pd
except ImportError as e:
    die(f"pandas not installed: {e}")


AGG_FUNCS = {"sum", "mean", "count", "min", "max", "first", "last", "nunique"}
OPS = {"==", "!=", "<", "<=", ">", ">=", "contains", "in", "notin", "isnull", "notnull"}


def _load(path, sep, encoding):
    try:
        return pd.read_csv(path, sep=sep, encoding=encoding)
    except Exception as e:  # noqa: BLE001
        die(f"read_failed:{e}")


def _apply_filter(df, opts):
    where = (opts or {}).get("where") or []
    if not isinstance(where, list):
        die("filter_where_must_be_list")
    for cond in where:
        if not isinstance(cond, dict):
            continue
        col = cond.get("column")
        op = cond.get("op")
        val = cond.get("value")
        if col not in df.columns:
            die(f"column_not_found:{col}")
        if op not in OPS:
            die(f"invalid_operator:{op}")
        if op == "==":
            df = df[df[col] == val]
        elif op == "!=":
            df = df[df[col] != val]
        elif op == "<":
            df = df[df[col] < val]
        elif op == "<=":
            df = df[df[col] <= val]
        elif op == ">":
            df = df[df[col] > val]
        elif op == ">=":
            df = df[df[col] >= val]
        elif op == "contains":
            df = df[df[col].astype(str).str.contains(str(val), na=False)]
        elif op == "in":
            if not isinstance(val, list):
                die("in_requires_list_value")
            df = df[df[col].isin(val)]
        elif op == "notin":
            if not isinstance(val, list):
                die("notin_requires_list_value")
            df = df[~df[col].isin(val)]
        elif op == "isnull":
            df = df[df[col].isna()]
        elif op == "notnull":
            df = df[df[col].notna()]
    return df


def _apply_select(df, opts):
    cols = (opts or {}).get("columns") or []
    if not isinstance(cols, list):
        die("select_columns_must_be_list")
    missing = [c for c in cols if c not in df.columns]
    if missing:
        die(f"column_not_found:{missing[0]}")
    return df[cols]


def _apply_rename(df, opts):
    m = (opts or {}).get("map") or {}
    if not isinstance(m, dict):
        die("rename_map_must_be_object")
    return df.rename(columns=m)


def _apply_aggregate(df, opts):
    group_by = (opts or {}).get("groupBy") or []
    metrics = (opts or {}).get("metrics") or []
    if not isinstance(group_by, list) or not group_by:
        die("aggregate_group_by_required")
    for g in group_by:
        if g not in df.columns:
            die(f"column_not_found:{g}")
    if not metrics:
        return df.groupby(group_by, dropna=False).size().reset_index(name="count")
    agg_spec = {}
    rename_map = {}
    for m in metrics:
        col = m.get("column")
        fn = m.get("fn", "sum")
        if col not in df.columns:
            die(f"column_not_found:{col}")
        if fn not in AGG_FUNCS:
            die(f"invalid_agg:{fn}")
        key = f"{col}_{fn}"
        agg_spec[key] = (col, fn)
        rename_map[key] = m.get("as") or key
    res = df.groupby(group_by, dropna=False).agg(**agg_spec).reset_index()
    if rename_map:
        res = res.rename(columns=rename_map)
    return res


def _apply_join(df, opts, sep, encoding):
    o = opts or {}
    other_name = o.get("other")
    if not other_name:
        die("join_other_required")
    on = o.get("on")
    if not on:
        die("join_on_required")
    how = o.get("how") or "inner"
    if how not in ("inner", "left", "right", "outer"):
        die(f"invalid_join_how:{how}")
    other = _load(resolve_input(other_name), sep, encoding)
    return df.merge(other, on=on, how=how)


def _apply_sort(df, opts):
    by = (opts or {}).get("by") or []
    asc = (opts or {}).get("ascending", True)
    if not isinstance(by, list) or not by:
        die("sort_by_required")
    for b in by:
        if b not in df.columns:
            die(f"column_not_found:{b}")
    return df.sort_values(by=by, ascending=bool(asc))


def _apply_dedup(df, opts):
    cols = (opts or {}).get("columns")
    return df.drop_duplicates(subset=cols if cols else None)


def _apply_dropna(df, opts):
    cols = (opts or {}).get("columns")
    return df.dropna(subset=cols if cols else None)


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    action = (spec.get("action") or "convert").lower()
    src = spec.get("source")
    if not src:
        die("source_required")
    sep = spec.get("separator") or ","
    encoding = spec.get("encoding") or "utf-8"
    out_fmt = (spec.get("outputFormat") or "csv").lower()
    if out_fmt not in ("csv", "xlsx"):
        die(f"invalid_output_format:{out_fmt}")
    out_name = spec.get("outputName") or "result"

    df = _load(resolve_input(src), sep, encoding)

    # Apply transforms in a deterministic order regardless of `action`,
    # then `action` just decides the final output shape. Users still set
    # `action` to the primary intent for clarity in logs.
    if "filter" in spec:
        df = _apply_filter(df, spec.get("filter"))
    if "dropna" in spec:
        df = _apply_dropna(df, spec.get("dropna"))
    if "dedup" in spec:
        df = _apply_dedup(df, spec.get("dedup"))
    if "join" in spec or action == "join":
        df = _apply_join(df, spec.get("join") or {}, sep, encoding)
    if "aggregate" in spec or action == "aggregate":
        if spec.get("aggregate"):
            df = _apply_aggregate(df, spec.get("aggregate"))
    if "select" in spec or action == "select":
        if spec.get("select"):
            df = _apply_select(df, spec.get("select"))
    if "rename" in spec or action == "rename":
        if spec.get("rename"):
            df = _apply_rename(df, spec.get("rename"))
    if "sort" in spec or action == "sort":
        if spec.get("sort"):
            df = _apply_sort(df, spec.get("sort"))

    out_path = build_out_path(out_name, out_fmt)
    try:
        if out_fmt == "csv":
            df.to_csv(out_path, index=False, sep=sep, encoding=encoding)
        else:
            df.to_excel(out_path, index=False)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed:{e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()

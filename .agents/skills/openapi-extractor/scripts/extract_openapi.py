#!/usr/bin/env python3
"""Extract endpoints, parameters, and POST/PUT payload attributes from OpenAPI specs.

Usage:
  python scripts/extract_openapi.py --api-name my-api --registry references/api_registry.example.json --output output.json
  python scripts/extract_openapi.py --spec ./openapi.yaml --api-name my-api --output output.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None

HTTP_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
BODY_METHODS = {"post", "put", "patch"}


def load_text(source: str) -> str:
    if source.startswith(("http://", "https://")):
        req = urllib.request.Request(source, headers={"User-Agent": "openapi-extractor/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")
    with open(source, "r", encoding="utf-8") as f:
        return f.read()


def load_structured(source: str) -> Dict[str, Any]:
    text = load_text(source)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if yaml is None:
            raise RuntimeError("This spec is not JSON and PyYAML is unavailable. Install pyyaml or provide JSON.")
        data = yaml.safe_load(text)
        if not isinstance(data, dict):
            raise ValueError("OpenAPI document must parse to an object")
        return data


def load_registry(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        return {}
    if not os.path.exists(path):
        raise FileNotFoundError(f"Registry not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_spec_source(api_name: Optional[str], registry: Dict[str, Any], explicit_spec: Optional[str]) -> Tuple[str, Dict[str, Any]]:
    if explicit_spec:
        return explicit_spec, {"name": api_name or os.path.basename(explicit_spec), "source": explicit_spec}
    if not api_name:
        raise ValueError("Provide --api-name or --spec")
    apis = registry.get("apis", registry)
    if not isinstance(apis, dict):
        raise ValueError("Registry must be an object or contain an 'apis' object")
    key = api_name if api_name in apis else next((k for k in apis if k.lower() == api_name.lower()), None)
    if key is None:
        available = ", ".join(sorted(apis.keys())) or "none"
        raise KeyError(f"API '{api_name}' not found in registry. Available APIs: {available}")
    item = apis[key]
    if isinstance(item, str):
        return item, {"name": key, "source": item}
    if isinstance(item, dict):
        source = item.get("spec") or item.get("url") or item.get("path")
        if not source:
            raise ValueError(f"Registry entry for '{key}' must include spec/url/path")
        return source, {"name": key, **item}
    raise ValueError(f"Unsupported registry entry for '{key}'")


def resolve_ref(root: Dict[str, Any], ref: str) -> Any:
    if not ref.startswith("#/"):
        return {"$ref": ref, "unresolved": True}
    node: Any = root
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if not isinstance(node, dict) or part not in node:
            return {"$ref": ref, "unresolved": True}
        node = node[part]
    return node


def deref(root: Dict[str, Any], node: Any, seen: Optional[Set[str]] = None) -> Any:
    if seen is None:
        seen = set()
    if isinstance(node, dict) and "$ref" in node:
        ref = node["$ref"]
        if ref in seen:
            return {"$ref": ref, "recursive": True}
        resolved = resolve_ref(root, ref)
        if isinstance(resolved, dict):
            merged = {k: v for k, v in node.items() if k != "$ref"}
            base = dict(resolved)
            base.update(merged)
            return deref(root, base, seen | {ref})
        return resolved
    return node


def schema_type(schema: Dict[str, Any]) -> str:
    if "type" in schema:
        if schema["type"] == "array":
            items = schema.get("items", {})
            if isinstance(items, dict):
                return f"array[{schema_type(items)}]"
            return "array"
        return str(schema["type"])
    for key in ("oneOf", "anyOf", "allOf"):
        if key in schema:
            return key
    if "properties" in schema:
        return "object"
    return "unknown"


def extract_schema_attributes(root: Dict[str, Any], schema: Any, prefix: str = "", required: Optional[Iterable[str]] = None, seen_refs: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
    if seen_refs is None:
        seen_refs = set()
    if not isinstance(schema, dict):
        return []
    if "$ref" in schema:
        ref = schema["$ref"]
        if ref in seen_refs:
            return [{"name": prefix or ref, "type": "recursive_ref", "required": False, "ref": ref}]
        return extract_schema_attributes(root, deref(root, schema, seen_refs), prefix, required, seen_refs | {ref})

    attrs: List[Dict[str, Any]] = []
    req = set(required or schema.get("required", []) or [])

    for combiner in ("allOf", "oneOf", "anyOf"):
        if combiner in schema and isinstance(schema[combiner], list):
            for idx, sub in enumerate(schema[combiner]):
                attrs.extend(extract_schema_attributes(root, sub, prefix, req, seen_refs))
            return attrs

    if schema.get("type") == "array" and isinstance(schema.get("items"), dict):
        item_prefix = f"{prefix}[]" if prefix else "[]"
        item_attrs = extract_schema_attributes(root, schema["items"], item_prefix, None, seen_refs)
        if item_attrs:
            return item_attrs
        return [{"name": prefix or "[]", "type": schema_type(schema), "required": False}]

    props = schema.get("properties")
    if isinstance(props, dict):
        for name, prop in props.items():
            prop_resolved = deref(root, prop, seen_refs)
            full_name = f"{prefix}.{name}" if prefix else name
            entry = {
                "name": full_name,
                "type": schema_type(prop_resolved) if isinstance(prop_resolved, dict) else "unknown",
                "required": name in req,
            }
            if isinstance(prop_resolved, dict):
                if "format" in prop_resolved:
                    entry["format"] = prop_resolved["format"]
                if "description" in prop_resolved:
                    entry["description"] = prop_resolved["description"]
                if "enum" in prop_resolved:
                    entry["enum"] = prop_resolved["enum"]
            attrs.append(entry)
            if isinstance(prop_resolved, dict) and ("properties" in prop_resolved or prop_resolved.get("type") == "array" or any(k in prop_resolved for k in ("allOf", "oneOf", "anyOf"))):
                attrs.extend(extract_schema_attributes(root, prop_resolved, full_name, None, seen_refs))
        return attrs

    if prefix:
        return [{"name": prefix, "type": schema_type(schema), "required": False}]
    return []


def extract_parameter(root: Dict[str, Any], param: Any) -> Dict[str, Any]:
    p = deref(root, param)
    if not isinstance(p, dict):
        return {"name": "unknown", "in": "unknown"}
    schema = deref(root, p.get("schema", {})) if isinstance(p.get("schema"), dict) else {}
    item: Dict[str, Any] = {
        "name": p.get("name", "unknown"),
        "in": p.get("in", "unknown"),
        "required": bool(p.get("required", False)),
        "type": schema_type(schema) if isinstance(schema, dict) else "unknown",
    }
    for field in ("description", "deprecated", "style", "explode"):
        if field in p:
            item[field] = p[field]
    if isinstance(schema, dict):
        for field in ("format", "enum", "default", "example"):
            if field in schema:
                item[field] = schema[field]
    return item


def extract_request_body(root: Dict[str, Any], request_body: Any) -> Dict[str, Any]:
    rb = deref(root, request_body)
    result: Dict[str, Any] = {"required": False, "content_types": [], "attributes": []}
    if not isinstance(rb, dict):
        return result
    result["required"] = bool(rb.get("required", False))
    if "description" in rb:
        result["description"] = rb["description"]
    content = rb.get("content", {})
    if not isinstance(content, dict):
        return result
    for content_type, media in content.items():
        result["content_types"].append(content_type)
        if isinstance(media, dict) and isinstance(media.get("schema"), dict):
            attrs = extract_schema_attributes(root, media["schema"])
            for attr in attrs:
                attr.setdefault("content_type", content_type)
            result["attributes"].extend(attrs)
    return result


def extract_openapi(doc: Dict[str, Any], api_meta: Dict[str, Any]) -> Dict[str, Any]:
    paths = doc.get("paths", {})
    endpoints: List[Dict[str, Any]] = []
    if not isinstance(paths, dict):
        raise ValueError("OpenAPI document has no valid paths object")

    for path, path_item in sorted(paths.items()):
        if not isinstance(path_item, dict):
            continue
        path_params = path_item.get("parameters", []) if isinstance(path_item.get("parameters"), list) else []
        for method, operation in sorted(path_item.items()):
            if method.lower() not in HTTP_METHODS or not isinstance(operation, dict):
                continue
            params = [extract_parameter(doc, p) for p in path_params + (operation.get("parameters", []) if isinstance(operation.get("parameters"), list) else [])]
            grouped = {"path": [], "query": [], "header": [], "cookie": [], "other": []}
            for p in params:
                grouped[p["in"] if p.get("in") in grouped else "other"].append(p)
            endpoint: Dict[str, Any] = {
                "method": method.upper(),
                "path": path,
                "operation_id": operation.get("operationId"),
                "summary": operation.get("summary"),
                "description": operation.get("description"),
                "tags": operation.get("tags", []),
                "parameters": grouped,
            }
            if method.lower() in BODY_METHODS:
                endpoint["request_body"] = extract_request_body(doc, operation.get("requestBody", {}))
            endpoints.append(endpoint)

    return {
        "api": {
            "name": api_meta.get("name"),
            "source": api_meta.get("source") or api_meta.get("spec") or api_meta.get("url") or api_meta.get("path"),
            "title": (doc.get("info") or {}).get("title"),
            "version": (doc.get("info") or {}).get("version"),
            "openapi": doc.get("openapi") or doc.get("swagger"),
        },
        "endpoint_count": len(endpoints),
        "endpoints": endpoints,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract OpenAPI endpoints and request-body attributes to JSON")
    parser.add_argument("--api-name", help="API name to resolve from registry")
    parser.add_argument("--registry", default="references/api_registry.json", help="JSON registry mapping API names to spec URLs/paths")
    parser.add_argument("--spec", help="Direct OpenAPI JSON/YAML file path or URL")
    parser.add_argument("--output", "-o", help="Output JSON file. Defaults to stdout")
    args = parser.parse_args()

    registry = load_registry(args.registry) if args.registry and os.path.exists(args.registry) else {}
    source, meta = resolve_spec_source(args.api_name, registry, args.spec)
    doc = load_structured(source)
    output = extract_openapi(doc, meta)
    payload = json.dumps(output, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(payload + "\n")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

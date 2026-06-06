#!/usr/bin/env python3
"""Find and remove duplicate modules created by scanner migration.

When migrating from old ts-scanner to ts-scan, modules are re-created
with new IDs. This script identifies duplicates (same name within a
project) and marks the older one (by last scan date) for deletion.

Usage:
    export TS_API_KEY=your-api-key

    # Step 1+2: List duplicates (dry run, no deletions)
    python3 scripts/cleanup-duplicate-modules.py [--project PROJECT_NAME]

    # Step 3: Actually delete the marked modules
    python3 scripts/cleanup-duplicate-modules.py --delete [--project PROJECT_NAME]
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API_BASE = os.environ.get("TS_API_BASE_URL", "https://api.trustsource.io/v2")
API_KEY = os.environ.get("TS_API_KEY")


def api_get(path: str):
    url = f"{API_BASE}{path}"
    req = Request(url, headers={"x-api-key": API_KEY, "Accept": "application/json"})
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"API error {e.code} on {path}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def api_delete(path: str) -> int:
    url = f"{API_BASE}{path}"
    req = Request(
        url,
        method="DELETE",
        headers={"x-api-key": API_KEY, "Accept": "application/json"},
    )
    try:
        with urlopen(req) as resp:
            return resp.status
    except HTTPError as e:
        return e.code


def find_latest_scan(module_id: str, scans: list) -> Optional[str]:
    """Find the most recent scan submission date for a module."""
    dates = [
        s["submitted"]
        for s in scans
        if s.get("moduleId") == module_id and "submitted" in s
    ]
    if not dates:
        return None
    return max(dates)


def format_date(iso_str: Optional[str]) -> str:
    if not iso_str:
        return "-"
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return iso_str


def main():
    if not API_KEY:
        print("Error: TS_API_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)

    do_delete = "--delete" in sys.argv
    project_filter = None
    if "--project" in sys.argv:
        idx = sys.argv.index("--project")
        if idx + 1 < len(sys.argv):
            project_filter = sys.argv[idx + 1]

    # Fetch data
    projects = api_get("/core/projects")
    scans = api_get("/core/scans")

    if project_filter:
        projects = [
            p for p in projects if p["name"].lower() == project_filter.lower()
        ]
        if not projects:
            print(f"Project '{project_filter}' not found.", file=sys.stderr)
            sys.exit(1)

    to_delete = []

    for project in sorted(projects, key=lambda p: p["name"]):
        modules = api_get(f"/core/modules?projectId={project['_id']}")
        if not modules:
            continue

        # Group modules by name
        by_name = defaultdict(list)
        for mod in modules:
            last_scan = find_latest_scan(mod["_id"], scans)
            by_name[mod["name"]].append({
                "_id": mod["_id"],
                "name": mod["name"],
                "last_scan": last_scan,
            })

        # Find duplicates
        has_duplicates = False
        for name, group in sorted(by_name.items()):
            if len(group) < 2:
                continue

            if not has_duplicates:
                print(f"\n{'='*80}")
                print(f"Project: {project['name']}")
                print(f"{'='*80}")
                has_duplicates = True

            # Sort by last_scan descending — newest first, None last
            group.sort(
                key=lambda m: m["last_scan"] or "0000",
                reverse=True,
            )

            print(f"\n  Module: \"{name}\" ({len(group)} copies)")
            for i, mod in enumerate(group):
                if i == 0:
                    marker = "  KEEP  "
                    print(
                        f"    {marker}  {mod['_id']}  "
                        f"last scan: {format_date(mod['last_scan'])}"
                    )
                else:
                    marker = "  DELETE"
                    to_delete.append(mod)
                    print(
                        f"    {marker}  {mod['_id']}  "
                        f"last scan: {format_date(mod['last_scan'])}"
                    )

    if not to_delete:
        print("\nNo duplicate modules found.")
        return

    print(f"\n{'='*80}")
    print(f"Summary: {len(to_delete)} module(s) marked for deletion")
    print(f"{'='*80}")

    if not do_delete:
        print("\nDry run — no modules were deleted.")
        print("Run with --delete to actually remove the marked modules.")
        return

    print("\nDeleting modules...")
    ok = 0
    failed = 0
    for mod in to_delete:
        status = api_delete(f"/core/modules/{mod['_id']}")
        if status in (200, 204):
            print(f"  Deleted {mod['_id']} ({mod['name']})")
            ok += 1
        else:
            print(f"  FAILED  {mod['_id']} ({mod['name']}) — HTTP {status}")
            failed += 1

    print(f"\nDone: {ok} deleted, {failed} failed.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""List all projects with their modules and last scan date.

Uses the TrustSource API v2. The last scan date is taken from the
most recent scan submission for each module.

Usage:
    export TS_API_KEY=your-api-key
    python3 scripts/list-project-modules.py [--project PROJECT_NAME]
"""

import json
import os
import sys
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

    # Parse optional --project filter
    project_filter = None
    if "--project" in sys.argv:
        idx = sys.argv.index("--project")
        if idx + 1 < len(sys.argv):
            project_filter = sys.argv[idx + 1]

    # Fetch all projects
    projects = api_get("/core/projects")

    if project_filter:
        projects = [
            p for p in projects
            if p["name"].lower() == project_filter.lower()
        ]
        if not projects:
            print(f"Project '{project_filter}' not found.", file=sys.stderr)
            sys.exit(1)

    # Fetch all scans (for last submitted date)
    scans = api_get("/core/scans")

    # Print header
    print(f"{'Project':<30} {'Module':<35} {'Last Scan':<20} {'Status'}")
    print("-" * 110)

    for project in sorted(projects, key=lambda p: p["name"]):
        modules = api_get(f"/core/modules?projectId={project['_id']}")

        if not modules:
            print(f"{project['name']:<30} {'(no modules)':<35}")
            continue

        for i, mod in enumerate(sorted(modules, key=lambda m: m["name"])):
            details = api_get(f"/core/modules/{mod['_id']}")
            status = details.get("status", "unknown")

            last_scan = find_latest_scan(mod["_id"], scans)

            proj_col = project["name"] if i == 0 else ""
            print(
                f"{proj_col:<30} {mod['name']:<35} {format_date(last_scan):<20} {status}"
            )

    print()


if __name__ == "__main__":
    main()

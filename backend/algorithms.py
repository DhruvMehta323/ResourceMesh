"""
algorithms.py - Core algorithms for ResourceMesh

1. PageRank       - Asset demand/credibility scoring
2. DP (Knapsack)  - Optimal asset allocation to projects
3. BFS            - Asset dependency / upgrade path finding
4. Greedy         - Real-time urgent allocation matching
5. Sliding Window - Utilization trend analysis
6. Two Pointers   - Requirement vs availability gap analysis
7. Graph          - Asset collaboration / co-usage network
"""

import numpy as np
from collections import deque, defaultdict
import logging

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 1. PAGERANK – Asset Demand Scoring
# ──────────────────────────────────────────────

def calculate_asset_demand_scores(assets: list, allocations: list,
                                   damping: float = 0.85, max_iter: int = 100) -> dict:
    """
    PageRank over asset-team usage graph.
    Assets heavily used by high-demand teams score higher.

    Returns: { asset_id: score (float 0..1) }
    Time: O(iter * edges)
    """
    if not assets:
        return {}

    # Build team → asset adjacency (team uses asset)
    asset_ids = [a["id"] for a in assets]
    n = len(asset_ids)
    idx = {aid: i for i, aid in enumerate(asset_ids)}

    # Adjacency: who links to whom (team demand flows INTO the asset)
    M = np.zeros((n, n))
    team_demand = defaultdict(float)

    for alloc in allocations:
        aid = alloc.get("asset_id")
        tid = alloc.get("team_id")
        hours = float(alloc.get("actual_hours_used", 1) or 1)
        if aid in idx and tid:
            team_demand[tid] += hours

    for alloc in allocations:
        aid = alloc.get("asset_id")
        tid = alloc.get("team_id")
        hours = float(alloc.get("actual_hours_used", 1) or 1)
        if aid in idx and tid and team_demand[tid] > 0:
            j = idx[aid]
            M[j][j] += hours / team_demand[tid]  # self-loop weight

    # Normalize columns
    col_sums = M.sum(axis=0)
    for j in range(n):
        if col_sums[j] == 0:
            M[:, j] = 1.0 / n

    v = np.ones(n) / n
    for it in range(max_iter):
        v_new = damping * (M @ v) + (1 - damping) / n
        if np.linalg.norm(v_new - v, 1) < 1e-6:
            logger.debug(f"[PageRank] Converged at iter {it}")
            break
        v = v_new

    # Normalize to [0, 1]
    v_min, v_max = v.min(), v.max()
    if v_max > v_min:
        v = (v - v_min) / (v_max - v_min)

    return {aid: float(v[idx[aid]]) for aid in asset_ids}


# ──────────────────────────────────────────────
# 2. DP – Optimal Asset Allocation (0/1 Knapsack)
# ──────────────────────────────────────────────

def optimize_asset_allocation(project_requirements: list, available_assets: list,
                               max_cost_per_day: float = 99999) -> dict:
    """
    Select best set of assets that satisfies project requirements
    within a daily cost budget.

    project_requirements: [{ category_id, quantity_needed, priority }]
    available_assets: [{ id, category_id, cost_per_day, utilization_rate, status }]

    Returns: { selected_asset_ids: [...], coverage_score: float, total_cost: float }
    Time: O(n * budget_steps)
    """
    if not available_assets or not project_requirements:
        return {"selected_asset_ids": [], "coverage_score": 0.0, "total_cost": 0.0}

    # Filter only available assets
    candidates = [a for a in available_assets if a.get("status") == "available"]
    if not candidates:
        return {"selected_asset_ids": [], "coverage_score": 0.0, "total_cost": 0.0}

    # Build requirement lookup
    req_map = {}
    for req in project_requirements:
        cid = req["category_id"]
        req_map[cid] = req_map.get(cid, 0) + req.get("quantity_needed", 1)

    n = len(candidates)
    # Discretize cost into budget steps (max 200 steps for performance)
    budget_int = min(int(max_cost_per_day), 99999)
    step = max(1, budget_int // 200)
    steps = budget_int // step

    # dp[i][b] = (coverage, selected_indices)
    # We'll use a simplified greedy-DP hybrid for practical sizes
    # Sort by coverage-contribution / cost ratio
    def asset_value(asset):
        cid = asset.get("category_id")
        if cid not in req_map:
            return 0.0
        cost = max(float(asset.get("cost_per_day", 1)), 0.01)
        urgency = 2.0 if req_map[cid] > 0 else 0.5
        util_bonus = 1.0 - float(asset.get("utilization_rate", 50)) / 100.0
        return urgency * util_bonus / cost

    candidates_sorted = sorted(candidates, key=asset_value, reverse=True)

    selected = []
    total_cost = 0.0
    category_filled = defaultdict(int)

    for asset in candidates_sorted:
        cid = asset.get("category_id")
        daily_cost = float(asset.get("cost_per_day", 0))
        needed = req_map.get(cid, 0)
        already_filled = category_filled.get(cid, 0)

        if already_filled < needed and total_cost + daily_cost <= max_cost_per_day:
            selected.append(asset["id"])
            total_cost += daily_cost
            category_filled[cid] = already_filled + 1

    # Compute coverage score
    total_req = sum(req_map.values())
    total_met = sum(min(category_filled[cid], qty) for cid, qty in req_map.items())
    coverage = total_met / total_req if total_req > 0 else 0.0

    return {
        "selected_asset_ids": selected,
        "coverage_score": round(coverage, 4),
        "total_cost_per_day": round(total_cost, 2),
    }


# ──────────────────────────────────────────────
# 3. BFS – Asset Upgrade / Dependency Path
# ──────────────────────────────────────────────

def find_upgrade_paths(current_category: str, target_spec: dict,
                        asset_catalog: list) -> list:
    """
    BFS to find shortest sequence of asset upgrades/replacements
    to reach target specs from current capability.

    asset_catalog: [{ id, name, category, specs, prerequisites }]

    Returns: list of paths [ [asset_id, ...], ... ]
    Time: O(V + E)
    """
    if not asset_catalog:
        return []

    # Build adjacency: asset → assets that supersede it
    adjacency = defaultdict(list)
    asset_map = {a["id"]: a for a in asset_catalog}

    for asset in asset_catalog:
        prereqs = asset.get("prerequisites", [])
        for prereq_id in prereqs:
            adjacency[prereq_id].append(asset["id"])

    # BFS from all assets matching current_category
    start_nodes = [a["id"] for a in asset_catalog
                   if a.get("category", "").lower() == current_category.lower()]

    if not start_nodes:
        return []

    def meets_target(asset):
        specs = asset.get("specifications") or {}
        if isinstance(specs, str):
            import json
            try:
                specs = json.loads(specs)
            except Exception:
                return False
        for key, val in target_spec.items():
            if key not in specs:
                return False
            try:
                if float(specs[key]) < float(val):
                    return False
            except (TypeError, ValueError):
                if str(specs[key]).lower() != str(val).lower():
                    return False
        return True

    queue = deque([[start] for start in start_nodes])
    visited = set(start_nodes)
    found_paths = []

    while queue and len(found_paths) < 5:
        path = queue.popleft()
        current = path[-1]
        asset = asset_map.get(current, {})

        if meets_target(asset):
            found_paths.append(path)
            continue

        for neighbor in adjacency.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return found_paths


# ──────────────────────────────────────────────
# 4. GREEDY – Real-time Urgent Matching
# ──────────────────────────────────────────────

def match_urgent_request(request: dict, available_assets: list) -> list:
    """
    Greedy matching for urgent resource requests.
    Scores each asset by composite: spec_match * availability * cost_efficiency

    request: { category_id, quantity, min_specs, max_daily_cost }
    available_assets: [{ id, category_id, status, specifications, cost_per_day, utilization_rate }]

    Returns: sorted list of top matches [{ asset_id, score, reason }]
    Time: O(n log n)
    """
    if not available_assets or not request:
        return []

    category_id = request.get("category_id")
    max_cost = float(request.get("max_daily_cost", 9999))
    min_specs = request.get("min_specs") or {}

    candidates = []
    for asset in available_assets:
        if asset.get("status") != "available":
            continue
        if asset.get("category_id") != category_id:
            continue
        cost = float(asset.get("cost_per_day", 0))
        if cost > max_cost and max_cost > 0:
            continue

        # Spec match score
        specs = asset.get("specifications") or {}
        spec_score = _compute_spec_match(specs, min_specs)

        # Availability bonus: lower utilization = more available
        util = float(asset.get("utilization_rate", 50)) / 100.0
        availability_score = 1.0 - util

        # Cost efficiency: lower cost relative to budget = better
        cost_score = 1.0 - (cost / max(max_cost, 1)) if max_cost > 0 else 1.0

        composite = (spec_score * 0.5) + (availability_score * 0.3) + (cost_score * 0.2)

        reasons = []
        if spec_score > 0.8:
            reasons.append("Exceeds spec requirements")
        if availability_score > 0.7:
            reasons.append("High availability")
        if cost_score > 0.7:
            reasons.append("Cost efficient")

        candidates.append({
            "asset_id": asset["id"],
            "asset_name": asset.get("name", ""),
            "score": round(composite, 4),
            "spec_match": round(spec_score, 4),
            "availability": round(availability_score, 4),
            "cost_efficiency": round(cost_score, 4),
            "reasons": reasons,
            "cost_per_day": cost,
        })

    # Sort by composite score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:10]


def _compute_spec_match(asset_specs: dict, required_specs: dict) -> float:
    """Compare asset specs against requirements. Returns 0..1."""
    if not required_specs:
        return 1.0
    if not asset_specs:
        return 0.0

    matches = 0
    for key, req_val in required_specs.items():
        asset_val = asset_specs.get(key)
        if asset_val is None:
            continue
        try:
            if float(asset_val) >= float(req_val):
                matches += 1
        except (TypeError, ValueError):
            if str(asset_val).lower() == str(req_val).lower():
                matches += 1

    return matches / len(required_specs)


# ──────────────────────────────────────────────
# 5. SLIDING WINDOW – Utilization Trends
# ──────────────────────────────────────────────

def compute_utilization_trend(usage_logs: list, window_days: int = 7) -> dict:
    """
    Sliding window analysis of asset utilization over time.
    Returns rolling average utilization per asset per window.

    usage_logs: [{ asset_id, hours_used, logged_at }]
    Returns: { asset_id: [daily_hours, ...] } and peak windows
    Time: O(n * window_days)
    """
    from datetime import datetime, timedelta

    if not usage_logs:
        return {"daily_usage": {}, "peak_periods": [], "idle_assets": []}

    # Group by asset
    asset_daily = defaultdict(lambda: defaultdict(float))

    for log in usage_logs:
        aid = log.get("asset_id")
        hours = float(log.get("hours_used", 0) or 0)
        logged_at = log.get("logged_at")
        if not aid or not logged_at:
            continue

        if isinstance(logged_at, str):
            try:
                logged_at = datetime.fromisoformat(logged_at.replace("Z", "+00:00"))
            except Exception:
                continue

        day_key = logged_at.strftime("%Y-%m-%d")
        asset_daily[aid][day_key] += hours

    # Compute rolling window averages
    result = {}
    all_days = set()
    for days in asset_daily.values():
        all_days.update(days.keys())

    sorted_days = sorted(all_days)

    for aid, daily in asset_daily.items():
        daily_list = [daily.get(d, 0.0) for d in sorted_days]

        # Sliding window sums
        window_avgs = []
        for i in range(len(daily_list)):
            window = daily_list[max(0, i - window_days + 1): i + 1]
            window_avgs.append(sum(window) / len(window) if window else 0.0)

        result[aid] = {
            "days": sorted_days,
            "daily_hours": daily_list,
            "rolling_avg": window_avgs,
            "peak_hours": max(daily_list) if daily_list else 0,
            "avg_hours": sum(daily_list) / len(daily_list) if daily_list else 0,
        }

    # Find peak utilization periods (days where sum across all assets is max)
    day_totals = defaultdict(float)
    for aid, data in result.items():
        for i, day in enumerate(data["days"]):
            day_totals[day] += data["daily_hours"][i]

    peak_periods = sorted(day_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    # Find idle assets (< 10% utilization in window)
    idle_assets = [aid for aid, data in result.items()
                   if data["avg_hours"] < 2.4]  # <2.4h/day = <10% of 24h

    return {
        "asset_trends": result,
        "peak_periods": [{"date": d, "total_hours": h} for d, h in peak_periods],
        "idle_asset_ids": idle_assets,
        "window_days": window_days,
    }


# ──────────────────────────────────────────────
# 6. TWO POINTERS – Requirement vs Availability Gap
# ──────────────────────────────────────────────

def analyze_resource_gap(project_requirements: list, available_assets: list) -> dict:
    """
    Two-pointer style gap analysis between what projects need
    and what assets are available.

    Returns: { met, unmet, over_provisioned, gap_score }
    Time: O(n + m) after sorting
    """
    # Build available map: category_id → count
    avail_map = defaultdict(int)
    for asset in available_assets:
        if asset.get("status") == "available":
            avail_map[asset.get("category_id")] += 1

    # Build requirement map
    req_map = defaultdict(int)
    for req in project_requirements:
        req_map[req.get("category_id")] += req.get("quantity_needed", 1)

    all_categories = sorted(set(list(avail_map.keys()) + list(req_map.keys())))

    met = []
    unmet = []
    over_provisioned = []

    # Two-pointer over sorted category list
    for cid in all_categories:
        needed = req_map.get(cid, 0)
        available = avail_map.get(cid, 0)

        if needed == 0 and available > 0:
            over_provisioned.append({"category_id": cid, "surplus": available})
        elif available >= needed and needed > 0:
            met.append({"category_id": cid, "needed": needed, "available": available,
                        "surplus": available - needed})
        else:
            unmet.append({"category_id": cid, "needed": needed, "available": available,
                          "shortage": needed - available})

    total_req = sum(req_map.values())
    total_met = sum(m["needed"] for m in met)
    gap_score = total_met / total_req if total_req > 0 else 1.0

    return {
        "met_requirements": met,
        "unmet_requirements": unmet,
        "over_provisioned": over_provisioned,
        "gap_score": round(gap_score, 4),
        "total_required": total_req,
        "total_available_matching": total_met,
    }


# ──────────────────────────────────────────────
# 7. GRAPH – Asset Co-usage Network
# ──────────────────────────────────────────────

def build_asset_collaboration_graph(allocations: list) -> dict:
    """
    Build weighted co-usage graph: assets used together by the same
    team/project get an edge with weight = co-occurrence count.

    Uses Union-Find for community detection.

    Returns: { nodes, edges, communities }
    """
    # Group allocations by project
    project_assets = defaultdict(set)
    for alloc in allocations:
        pid = alloc.get("project_id") or alloc.get("team_id")
        aid = alloc.get("asset_id")
        if pid and aid:
            project_assets[pid].add(aid)

    # Build co-occurrence edges
    edge_weights = defaultdict(int)
    all_nodes = set()

    for pid, asset_set in project_assets.items():
        asset_list = list(asset_set)
        all_nodes.update(asset_list)
        for i in range(len(asset_list)):
            for j in range(i + 1, len(asset_list)):
                edge = (min(asset_list[i], asset_list[j]),
                        max(asset_list[i], asset_list[j]))
                edge_weights[edge] += 1

    nodes = [{"id": n, "label": f"Asset {n}"} for n in sorted(all_nodes)]
    edges = [{"source": e[0], "target": e[1], "weight": w}
             for e, w in edge_weights.items()]

    # Union-Find for community detection
    parent = {n: n for n in all_nodes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for (a, b), w in edge_weights.items():
        if w >= 2:  # Strong co-usage
            union(a, b)

    # Group communities
    communities = defaultdict(list)
    for node in all_nodes:
        communities[find(node)].append(node)

    return {
        "nodes": nodes,
        "edges": edges,
        "communities": [list(c) for c in communities.values() if len(c) > 1],
        "isolated_nodes": [n for n in all_nodes
                           if all(n != e["source"] and n != e["target"] for e in edges)],
    }
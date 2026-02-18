from flask import Blueprint, request, jsonify
from config import query_db, cache_get, cache_set
from algorithms import (
    match_urgent_request,
    optimize_asset_allocation,
    analyze_resource_gap,
    calculate_asset_demand_scores,
    build_asset_collaboration_graph,
)
import logging

logger = logging.getLogger(__name__)
matching_bp = Blueprint("matching", __name__)


@matching_bp.route("/match/urgent", methods=["POST"])
def urgent_match():
    """Greedy real-time matching for an urgent resource request."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    assets = query_db("""
        SELECT a.*, ac.name AS category_name
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.status = 'available'
    """)

    matches = match_urgent_request(data, assets)
    return jsonify({
        "request": data,
        "matches": matches,
        "total_found": len(matches),
    })


@matching_bp.route("/match/optimize/<int:project_id>", methods=["GET"])
def optimize_for_project(project_id):
    """DP-based optimal asset allocation for a project."""
    cache_key = f"match:optimize:{project_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    project = query_db("SELECT * FROM projects WHERE id=%s", (project_id,), one=True)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    requirements = query_db("""
        SELECT pr.*, ac.name AS category_name
        FROM project_requirements pr
        JOIN asset_categories ac ON pr.category_id = ac.id
        WHERE pr.project_id=%s
    """, (project_id,))

    available_assets = query_db("""
        SELECT a.*, ac.name AS category_name
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.status = 'available'
    """)

    max_cost = float(project.get("budget", 0)) / 30 if project.get("budget") else 99999

    result = optimize_asset_allocation(requirements, available_assets, max_cost)

    # Enrich with asset details
    if result["selected_asset_ids"]:
        placeholders = ",".join(["%s"] * len(result["selected_asset_ids"]))
        selected_assets = query_db(f"""
            SELECT a.*, ac.name AS category_name, ac.icon, ac.color
            FROM assets a LEFT JOIN asset_categories ac ON a.category_id=ac.id
            WHERE a.id IN ({placeholders})
        """, result["selected_asset_ids"])
        result["selected_assets"] = selected_assets
    else:
        result["selected_assets"] = []

    result["project"] = project
    result["requirements"] = requirements
    cache_set(cache_key, result, ttl=120)
    return jsonify(result)


@matching_bp.route("/match/gap-analysis", methods=["GET"])
def gap_analysis():
    """Two-pointer gap analysis across all active projects."""
    cache_key = "match:gap:all"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    requirements = query_db("""
        SELECT pr.category_id, pr.quantity_needed, pr.priority, p.name AS project_name
        FROM project_requirements pr
        JOIN projects p ON pr.project_id = p.id
        WHERE p.status IN ('planning', 'active')
    """)

    available_assets = query_db("""
        SELECT a.id, a.category_id, a.status, a.name
        FROM assets a WHERE a.status = 'available'
    """)

    gap = analyze_resource_gap(requirements, available_assets)

    # Enrich category info
    cats = {c["id"]: c for c in query_db("SELECT * FROM asset_categories")}
    for item in gap["met_requirements"] + gap["unmet_requirements"] + gap["over_provisioned"]:
        cid = item.get("category_id")
        if cid in cats:
            item["category_name"] = cats[cid]["name"]
            item["category_icon"] = cats[cid]["icon"]
            item["category_color"] = cats[cid]["color"]

    cache_set(cache_key, gap, ttl=180)
    return jsonify(gap)


@matching_bp.route("/match/demand-scores", methods=["GET"])
def demand_scores():
    """PageRank-based asset demand scoring."""
    cache_key = "match:demand_scores"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    assets = query_db("SELECT id, name, status, category_id FROM assets")
    allocations = query_db("""
        SELECT asset_id, team_id, actual_hours_used
        FROM asset_allocations WHERE status IN ('active','released')
    """)

    scores = calculate_asset_demand_scores(assets, allocations)

    # Enrich
    asset_map = {a["id"]: a for a in assets}
    result = []
    for aid, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        a = asset_map.get(aid, {})
        result.append({
            "asset_id": aid,
            "asset_name": a.get("name"),
            "demand_score": round(score, 4),
            "status": a.get("status"),
        })

    cache_set(cache_key, result, ttl=300)
    return jsonify(result)


@matching_bp.route("/match/collaboration-graph", methods=["GET"])
def collaboration_graph():
    """Asset co-usage graph using Union-Find community detection."""
    cache_key = "match:collab_graph"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    allocations = query_db("""
        SELECT asset_id, team_id, project_id
        FROM asset_allocations
        WHERE status IN ('active','released')
    """)

    graph = build_asset_collaboration_graph(allocations)

    # Enrich node labels
    if graph["nodes"]:
        ids = [n["id"] for n in graph["nodes"]]
        placeholders = ",".join(["%s"] * len(ids))
        asset_details = query_db(f"""
            SELECT a.id, a.name, a.asset_tag, ac.name AS category_name, ac.color
            FROM assets a LEFT JOIN asset_categories ac ON a.category_id=ac.id
            WHERE a.id IN ({placeholders})
        """, ids)
        asset_map = {a["id"]: a for a in asset_details}
        for node in graph["nodes"]:
            detail = asset_map.get(node["id"], {})
            node["label"] = detail.get("name", f"Asset {node['id']}")
            node["category"] = detail.get("category_name")
            node["color"] = detail.get("color", "#6366f1")

    cache_set(cache_key, graph, ttl=300)
    return jsonify(graph)
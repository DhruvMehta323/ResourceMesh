from flask import Blueprint, request, jsonify
from config import query_db, cache_delete_pattern
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
allocations_bp = Blueprint("allocations", __name__)


@allocations_bp.route("/allocations", methods=["GET"])
def list_allocations():
    status = request.args.get("status", "active")
    rows = query_db("""
        SELECT aa.*,
               a.name AS asset_name, a.asset_tag, a.status AS asset_status,
               ac.name AS category_name, ac.icon, ac.color,
               t.name AS team_name, t.department,
               p.name AS project_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN teams t ON aa.team_id = t.id
        LEFT JOIN projects p ON aa.project_id = p.id
        WHERE aa.status = %s
        ORDER BY aa.allocated_at DESC
    """, (status,))
    return jsonify(rows)


@allocations_bp.route("/allocations", methods=["POST"])
def allocate_asset():
    data = request.get_json()
    asset_id = data.get("asset_id")
    team_id = data.get("team_id")

    if not asset_id or not team_id:
        return jsonify({"error": "asset_id and team_id are required"}), 400

    # Check asset is available
    asset = query_db("SELECT * FROM assets WHERE id=%s", (asset_id,), one=True)
    if not asset:
        return jsonify({"error": "Asset not found"}), 404
    if asset["status"] != "available":
        return jsonify({"error": f"Asset is {asset['status']}, not available"}), 409

    # Check no active allocation
    existing = query_db(
        "SELECT id FROM asset_allocations WHERE asset_id=%s AND status='active'",
        (asset_id,), one=True
    )
    if existing:
        return jsonify({"error": "Asset already has an active allocation"}), 409

    # Create allocation
    alloc_id = query_db("""
        INSERT INTO asset_allocations
            (asset_id, team_id, project_id, allocated_by, allocation_reason, planned_release)
        VALUES (%s,%s,%s,%s,%s,%s)
    """, (
        asset_id, team_id, data.get("project_id"),
        data.get("allocated_by", "system"),
        data.get("allocation_reason"),
        data.get("planned_release")
    ), commit=True)

    # Update asset status and team
    query_db("""
        UPDATE assets SET status='in_use', current_team_id=%s,
            last_used_at=NOW(), updated_at=NOW()
        WHERE id=%s
    """, (team_id, asset_id), commit=True)

    # Log
    query_db("""
        INSERT INTO usage_logs (asset_id, team_id, project_id, action, notes, performed_by)
        VALUES (%s,%s,%s,'allocated',%s,%s)
    """, (
        asset_id, team_id, data.get("project_id"),
        data.get("allocation_reason", ""),
        data.get("allocated_by", "system")
    ), commit=True)

    _bust_asset_caches(asset_id, team_id)
    return jsonify({"id": alloc_id, "message": "Asset allocated successfully"}), 201


@allocations_bp.route("/allocations/<int:alloc_id>/release", methods=["POST"])
def release_allocation(alloc_id):
    data = request.get_json() or {}

    alloc = query_db("SELECT * FROM asset_allocations WHERE id=%s", (alloc_id,), one=True)
    if not alloc:
        return jsonify({"error": "Allocation not found"}), 404
    if alloc["status"] != "active":
        return jsonify({"error": "Allocation is not active"}), 409

    hours_used = data.get("hours_used", 0)

    # Release allocation
    query_db("""
        UPDATE asset_allocations
        SET status='released', released_at=NOW(), actual_hours_used=%s
        WHERE id=%s
    """, (hours_used, alloc_id), commit=True)

    # Update asset
    query_db("""
        UPDATE assets
        SET status='available', current_team_id=NULL,
            total_hours_used = total_hours_used + %s,
            updated_at=NOW()
        WHERE id=%s
    """, (hours_used, alloc["asset_id"]), commit=True)

    # Log
    query_db("""
        INSERT INTO usage_logs (asset_id, team_id, project_id, action, hours_used, performed_by)
        VALUES (%s,%s,%s,'released',%s,%s)
    """, (
        alloc["asset_id"], alloc["team_id"], alloc["project_id"],
        hours_used, data.get("released_by", "system")
    ), commit=True)

    _bust_asset_caches(alloc["asset_id"], alloc["team_id"])
    return jsonify({"message": "Asset released successfully"})


def _bust_asset_caches(asset_id, team_id):
    cache_delete_pattern("assets:*")
    cache_delete_pattern(f"asset:{asset_id}")
    cache_delete_pattern("teams:*")
    cache_delete_pattern("analytics:*")
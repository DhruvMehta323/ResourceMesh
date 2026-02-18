from flask import Blueprint, request, jsonify
from config import query_db, cache_get, cache_set, cache_delete_pattern
import logging

logger = logging.getLogger(__name__)
resources_bp = Blueprint("resources", __name__)


def _asset_list_sql(filters=None):
    sql = """
        SELECT a.*, ac.name AS category_name, ac.icon, ac.color,
               t.name AS team_name
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN teams t ON a.current_team_id = t.id
    """
    conditions = []
    args = []
    if filters:
        if filters.get("status"):
            conditions.append("a.status = %s")
            args.append(filters["status"])
        if filters.get("category_id"):
            conditions.append("a.category_id = %s")
            args.append(filters["category_id"])
        if filters.get("search"):
            conditions.append("(a.name LIKE %s OR a.description LIKE %s OR a.asset_tag LIKE %s)")
            q = f"%{filters['search']}%"
            args += [q, q, q]
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY a.id DESC"
    return sql, args


@resources_bp.route("/assets", methods=["GET"])
def list_assets():
    filters = {
        "status": request.args.get("status"),
        "category_id": request.args.get("category_id", type=int),
        "search": request.args.get("search"),
    }
    cache_key = f"assets:{filters}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    sql, args = _asset_list_sql(filters)
    assets = query_db(sql, args)
    cache_set(cache_key, assets, ttl=60)
    return jsonify(assets)


@resources_bp.route("/assets/<int:asset_id>", methods=["GET"])
def get_asset(asset_id):
    cache_key = f"asset:{asset_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    asset = query_db("""
        SELECT a.*, ac.name AS category_name, ac.icon, ac.color,
               t.name AS team_name, t.department AS team_department
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN teams t ON a.current_team_id = t.id
        WHERE a.id = %s
    """, (asset_id,), one=True)

    if not asset:
        return jsonify({"error": "Asset not found"}), 404

    # Fetch active allocation
    alloc = query_db("""
        SELECT aa.*, p.name AS project_name, t.name AS team_name
        FROM asset_allocations aa
        LEFT JOIN projects p ON aa.project_id = p.id
        LEFT JOIN teams t ON aa.team_id = t.id
        WHERE aa.asset_id = %s AND aa.status = 'active'
        ORDER BY aa.allocated_at DESC LIMIT 1
    """, (asset_id,), one=True)

    # Usage logs (last 10)
    logs = query_db("""
        SELECT ul.*, t.name AS team_name, p.name AS project_name
        FROM usage_logs ul
        LEFT JOIN teams t ON ul.team_id = t.id
        LEFT JOIN projects p ON ul.project_id = p.id
        WHERE ul.asset_id = %s
        ORDER BY ul.logged_at DESC LIMIT 10
    """, (asset_id,))

    asset["active_allocation"] = alloc
    asset["usage_logs"] = logs
    cache_set(cache_key, asset, ttl=120)
    return jsonify(asset)


@resources_bp.route("/assets", methods=["POST"])
def create_asset():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    import json
    specs = data.get("specifications")
    specs_str = json.dumps(specs) if specs and not isinstance(specs, str) else specs

    new_id = query_db("""
        INSERT INTO assets (name, asset_tag, category_id, status, location,
            description, specifications, cost_per_hour, cost_per_day,
            purchase_date, purchase_cost)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        data.get("name"), data.get("asset_tag"), data.get("category_id"),
        data.get("status", "available"), data.get("location"),
        data.get("description"), specs_str,
        data.get("cost_per_hour", 0), data.get("cost_per_day", 0),
        data.get("purchase_date"), data.get("purchase_cost"),
    ), commit=True)

    cache_delete_pattern("assets:*")
    return jsonify({"id": new_id, "message": "Asset created"}), 201


@resources_bp.route("/assets/<int:asset_id>", methods=["PUT"])
def update_asset(asset_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    import json
    specs = data.get("specifications")
    specs_str = json.dumps(specs) if specs and not isinstance(specs, str) else specs

    query_db("""
        UPDATE assets SET name=%s, status=%s, location=%s, description=%s,
            specifications=%s, cost_per_hour=%s, cost_per_day=%s,
            category_id=%s, updated_at=NOW()
        WHERE id=%s
    """, (
        data.get("name"), data.get("status"), data.get("location"),
        data.get("description"), specs_str,
        data.get("cost_per_hour"), data.get("cost_per_day"),
        data.get("category_id"), asset_id
    ), commit=True)

    cache_delete_pattern("assets:*")
    cache_delete_pattern(f"asset:{asset_id}")
    return jsonify({"message": "Asset updated"})


@resources_bp.route("/assets/<int:asset_id>", methods=["DELETE"])
def delete_asset(asset_id):
    # Check active allocations
    active = query_db(
        "SELECT id FROM asset_allocations WHERE asset_id=%s AND status='active'",
        (asset_id,), one=True
    )
    if active:
        return jsonify({"error": "Cannot delete asset with active allocation"}), 409

    query_db("DELETE FROM assets WHERE id=%s", (asset_id,), commit=True)
    cache_delete_pattern("assets:*")
    cache_delete_pattern(f"asset:{asset_id}")
    return jsonify({"message": "Asset deleted"})


@resources_bp.route("/categories", methods=["GET"])
def list_categories():
    cats = query_db("""
        SELECT ac.*, COUNT(a.id) AS total_assets,
               SUM(CASE WHEN a.status='available' THEN 1 ELSE 0 END) AS available_count,
               SUM(CASE WHEN a.status='in_use' THEN 1 ELSE 0 END) AS in_use_count
        FROM asset_categories ac
        LEFT JOIN assets a ON a.category_id = ac.id
        GROUP BY ac.id ORDER BY ac.name
    """)
    return jsonify(cats)
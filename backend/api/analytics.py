from flask import Blueprint, request, jsonify
from config import query_db, cache_get, cache_set
from algorithms import compute_utilization_trend

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/analytics/overview", methods=["GET"])
def overview():
    cache_key = "analytics:overview"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    # Asset status breakdown
    status_counts = query_db("""
        SELECT status, COUNT(*) AS count FROM assets GROUP BY status
    """)

    # Total assets & value
    summary = query_db("""
        SELECT COUNT(*) AS total_assets,
               SUM(purchase_cost) AS total_value,
               AVG(utilization_rate) AS avg_utilization,
               SUM(total_hours_used) AS total_hours_logged
        FROM assets WHERE status != 'retired'
    """, one=True)

    # By category
    by_category = query_db("""
        SELECT ac.name, ac.icon, ac.color,
               COUNT(a.id) AS total,
               SUM(CASE WHEN a.status='available' THEN 1 ELSE 0 END) AS available,
               SUM(CASE WHEN a.status='in_use' THEN 1 ELSE 0 END) AS in_use,
               AVG(a.utilization_rate) AS avg_utilization
        FROM asset_categories ac
        LEFT JOIN assets a ON a.category_id = ac.id
        GROUP BY ac.id ORDER BY total DESC
    """)

    # Active allocations
    active_allocs = query_db("""
        SELECT COUNT(*) AS count FROM asset_allocations WHERE status='active'
    """, one=True)

    # Active projects
    active_projects = query_db("""
        SELECT COUNT(*) AS count FROM projects WHERE status='active'
    """, one=True)

    # Recent activity
    recent = query_db("""
        SELECT ul.*, a.name AS asset_name, t.name AS team_name
        FROM usage_logs ul
        LEFT JOIN assets a ON ul.asset_id = a.id
        LEFT JOIN teams t ON ul.team_id = t.id
        ORDER BY ul.logged_at DESC LIMIT 10
    """)

    # Idle assets (available + low utilization)
    idle = query_db("""
        SELECT a.id, a.name, a.asset_tag, a.utilization_rate,
               ac.name AS category_name, ac.color,
               a.cost_per_day,
               DATEDIFF(NOW(), a.last_used_at) AS days_idle
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.status = 'available'
          AND (a.utilization_rate < 20 OR a.last_used_at IS NULL
               OR a.last_used_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
        ORDER BY a.utilization_rate ASC LIMIT 15
    """)

    result = {
        "summary": summary,
        "status_breakdown": status_counts,
        "by_category": by_category,
        "active_allocations": active_allocs["count"] if active_allocs else 0,
        "active_projects": active_projects["count"] if active_projects else 0,
        "recent_activity": recent,
        "idle_assets": idle,
    }
    cache_set(cache_key, result, ttl=120)
    return jsonify(result)


@analytics_bp.route("/analytics/utilization-trend", methods=["GET"])
def utilization_trend():
    window = request.args.get("window", 7, type=int)
    asset_id = request.args.get("asset_id", type=int)

    cache_key = f"analytics:trend:{window}:{asset_id}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    sql = """
        SELECT asset_id, team_id, project_id, hours_used, logged_at
        FROM usage_logs WHERE action IN ('allocated','released')
    """
    args = []
    if asset_id:
        sql += " AND asset_id=%s"
        args.append(asset_id)
    sql += " ORDER BY logged_at ASC"

    logs = query_db(sql, args)
    trend = compute_utilization_trend(logs, window_days=window)
    cache_set(cache_key, trend, ttl=300)
    return jsonify(trend)


@analytics_bp.route("/analytics/cost-analysis", methods=["GET"])
def cost_analysis():
    cache_key = "analytics:cost"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    # Cost by team
    by_team = query_db("""
        SELECT t.name AS team_name, t.department,
               COUNT(a.id) AS asset_count,
               SUM(a.cost_per_day) AS daily_cost,
               SUM(a.cost_per_day * 30) AS monthly_cost,
               SUM(a.total_hours_used * a.cost_per_hour) AS total_spent
        FROM teams t
        LEFT JOIN assets a ON a.current_team_id = t.id
        GROUP BY t.id ORDER BY daily_cost DESC
    """)

    # Top expensive idle assets (money wasted)
    wasted = query_db("""
        SELECT a.name, a.asset_tag, a.cost_per_day,
               a.utilization_rate,
               a.cost_per_day * (1 - a.utilization_rate/100) AS wasted_daily,
               ac.name AS category_name, ac.color
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.status IN ('available','in_use')
          AND a.cost_per_day > 0
        ORDER BY wasted_daily DESC LIMIT 10
    """)

    result = {"by_team": by_team, "wasted_cost": wasted}
    cache_set(cache_key, result, ttl=300)
    return jsonify(result)
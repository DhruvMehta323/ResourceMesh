from flask import Blueprint, request, jsonify
from config import query_db, cache_get, cache_set, cache_delete_pattern

teams_bp = Blueprint("teams", __name__)


@teams_bp.route("/teams", methods=["GET"])
def list_teams():
    cached = cache_get("teams:all")
    if cached:
        return jsonify(cached)

    teams = query_db("""
        SELECT t.*,
               COUNT(DISTINCT a.id) AS asset_count,
               COUNT(DISTINCT aa.id) AS active_allocations
        FROM teams t
        LEFT JOIN assets a ON a.current_team_id = t.id
        LEFT JOIN asset_allocations aa ON aa.team_id = t.id AND aa.status = 'active'
        GROUP BY t.id ORDER BY t.name
    """)
    cache_set("teams:all", teams, ttl=120)
    return jsonify(teams)


@teams_bp.route("/teams/<int:team_id>", methods=["GET"])
def get_team(team_id):
    team = query_db("SELECT * FROM teams WHERE id=%s", (team_id,), one=True)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    assets = query_db("""
        SELECT a.*, ac.name AS category_name, ac.icon, ac.color
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE a.current_team_id = %s
    """, (team_id,))

    projects = query_db("""
        SELECT * FROM projects WHERE team_id = %s ORDER BY created_at DESC
    """, (team_id,))

    team["assets"] = assets
    team["projects"] = projects
    return jsonify(team)


@teams_bp.route("/teams", methods=["POST"])
def create_team():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    new_id = query_db("""
        INSERT INTO teams (name, department, lead_name, lead_email, headcount, budget, location)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (
        data["name"], data.get("department"), data.get("lead_name"),
        data.get("lead_email"), data.get("headcount", 0),
        data.get("budget", 0), data.get("location")
    ), commit=True)
    cache_delete_pattern("teams:*")
    return jsonify({"id": new_id, "message": "Team created"}), 201


@teams_bp.route("/teams/<int:team_id>", methods=["PUT"])
def update_team(team_id):
    data = request.get_json()
    query_db("""
        UPDATE teams SET name=%s, department=%s, lead_name=%s, lead_email=%s,
            headcount=%s, budget=%s, location=%s, updated_at=NOW()
        WHERE id=%s
    """, (
        data.get("name"), data.get("department"), data.get("lead_name"),
        data.get("lead_email"), data.get("headcount"), data.get("budget"),
        data.get("location"), team_id
    ), commit=True)
    cache_delete_pattern("teams:*")
    return jsonify({"message": "Team updated"})
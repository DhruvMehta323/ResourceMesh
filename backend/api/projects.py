from flask import Blueprint, request, jsonify
from config import query_db, cache_delete_pattern

projects_bp = Blueprint("projects", __name__)


@projects_bp.route("/projects", methods=["GET"])
def list_projects():
    status = request.args.get("status")
    sql = """
        SELECT p.*, t.name AS team_name,
               COUNT(DISTINCT aa.id) AS allocated_assets
        FROM projects p
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN asset_allocations aa ON aa.project_id = p.id AND aa.status='active'
    """
    args = []
    if status:
        sql += " WHERE p.status=%s"
        args.append(status)
    sql += " GROUP BY p.id ORDER BY p.created_at DESC"
    return jsonify(query_db(sql, args))


@projects_bp.route("/projects/<int:proj_id>", methods=["GET"])
def get_project(proj_id):
    proj = query_db("""
        SELECT p.*, t.name AS team_name
        FROM projects p LEFT JOIN teams t ON p.team_id=t.id
        WHERE p.id=%s
    """, (proj_id,), one=True)
    if not proj:
        return jsonify({"error": "Project not found"}), 404

    requirements = query_db("""
        SELECT pr.*, ac.name AS category_name, ac.icon, ac.color
        FROM project_requirements pr
        JOIN asset_categories ac ON pr.category_id = ac.id
        WHERE pr.project_id=%s
    """, (proj_id,))

    allocations = query_db("""
        SELECT aa.*, a.name AS asset_name, a.asset_tag, ac.name AS category_name, ac.icon
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        WHERE aa.project_id=%s AND aa.status='active'
    """, (proj_id,))

    proj["requirements"] = requirements
    proj["allocations"] = allocations
    return jsonify(proj)


@projects_bp.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    new_id = query_db("""
        INSERT INTO projects (name, description, team_id, status, priority,
            start_date, end_date, budget)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        data["name"], data.get("description"), data.get("team_id"),
        data.get("status", "planning"), data.get("priority", "medium"),
        data.get("start_date"), data.get("end_date"), data.get("budget", 0)
    ), commit=True)

    # Add requirements if provided
    reqs = data.get("requirements", [])
    for req in reqs:
        query_db("""
            INSERT INTO project_requirements (project_id, category_id, quantity_needed, priority)
            VALUES (%s,%s,%s,%s)
        """, (new_id, req["category_id"], req.get("quantity_needed", 1),
              req.get("priority", "required")), commit=True)

    cache_delete_pattern("analytics:*")
    return jsonify({"id": new_id, "message": "Project created"}), 201


@projects_bp.route("/projects/<int:proj_id>", methods=["PUT"])
def update_project(proj_id):
    data = request.get_json()
    query_db("""
        UPDATE projects SET name=%s, description=%s, status=%s, priority=%s,
            start_date=%s, end_date=%s, budget=%s, updated_at=NOW()
        WHERE id=%s
    """, (
        data.get("name"), data.get("description"), data.get("status"),
        data.get("priority"), data.get("start_date"), data.get("end_date"),
        data.get("budget"), proj_id
    ), commit=True)
    cache_delete_pattern("analytics:*")
    return jsonify({"message": "Project updated"})
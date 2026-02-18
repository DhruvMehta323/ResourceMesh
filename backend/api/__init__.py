from flask import Blueprint, jsonify
from config import get_db_connection, get_redis
import pymysql

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    status = {"status": "ok", "services": {}}

    # MySQL
    try:
        conn = get_db_connection()
        conn.ping(reconnect=False)
        conn.close()
        status["services"]["mysql"] = "ok"
    except Exception as e:
        status["services"]["mysql"] = f"error: {str(e)}"
        status["status"] = "degraded"

    # Redis
    try:
        r = get_redis()
        if r:
            r.ping()
            status["services"]["redis"] = "ok"
        else:
            status["services"]["redis"] = "unavailable (non-critical)"
    except Exception as e:
        status["services"]["redis"] = f"error: {str(e)}"

    return jsonify(status), 200 if status["status"] == "ok" else 207

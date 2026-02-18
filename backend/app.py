import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config, get_db_connection, get_redis
from api import health_bp
from api.resources import resources_bp
from api.teams import teams_bp
from api.allocations import allocations_bp
from api.projects import projects_bp
from api.matching import matching_bp
from api.analytics import analytics_bp

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if Config.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("resourcemesh")


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["DEBUG"] = Config.DEBUG

    # CORS – allow the Vite dev server and production builds
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Register blueprints ────────────────────────────────────────────────
    app.register_blueprint(health_bp)
    app.register_blueprint(resources_bp,   url_prefix="/api/v1")
    app.register_blueprint(teams_bp,       url_prefix="/api/v1")
    app.register_blueprint(allocations_bp, url_prefix="/api/v1")
    app.register_blueprint(projects_bp,    url_prefix="/api/v1")
    app.register_blueprint(matching_bp,    url_prefix="/api/v1")
    app.register_blueprint(analytics_bp,   url_prefix="/api/v1")

    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "ResourceMesh backend",
            "health": "/health",
            "api_base": "/api/v1",
        }), 200

    # ── Global error handlers ──────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found", "path": str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Unhandled 500 error")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception(f"Unhandled exception: {e}")
        return jsonify({"error": str(e)}), 500

    return app


# ── Startup checks ─────────────────────────────────────────────────────────

def check_db():
    try:
        conn = get_db_connection()
        conn.close()
        logger.info("✅  MySQL connected")
        return True
    except Exception as e:
        logger.error(f"❌  MySQL connection failed: {e}")
        logger.error("    Make sure MySQL is running and .env is configured correctly.")
        logger.error("    Then run:  mysql -u root -p < backend/init_db.sql")
        return False


def check_redis():
    try:
        r = get_redis()
        if r:
            logger.info("✅  Redis connected (caching enabled)")
        else:
            logger.warning("⚠️   Redis unavailable – running without cache (OK for dev)")
    except Exception:
        logger.warning("⚠️   Redis unavailable – running without cache")


# ── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("=" * 55)
    logger.info("  🔧  ResourceMesh Backend")
    logger.info("=" * 55)

    db_ok = check_db()
    check_redis()

    if not db_ok:
        logger.error("Cannot start without a database. Exiting.")
        import sys; sys.exit(1)

    app = create_app()

    logger.info(f"🚀  Starting on http://0.0.0.0:{Config.PORT}")
    logger.info(f"📊  Debug mode: {Config.DEBUG}")
    logger.info("=" * 55)

    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.DEBUG,
        use_reloader=Config.DEBUG,
    )

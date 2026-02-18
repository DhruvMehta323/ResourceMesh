"""
config.py - Configuration and database connection management
"""

import os
import json
import logging
from dotenv import load_dotenv
import pymysql
import redis

load_dotenv()

logger = logging.getLogger(__name__)

class Config:
    FLASK_ENV       = os.getenv("FLASK_ENV", "development")
    DEBUG           = os.getenv("FLASK_DEBUG", "1") == "1"
    SECRET_KEY      = os.getenv("SECRET_KEY", "dev-secret-key")
    FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:5173")
    MYSQL_HOST      = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT      = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER      = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD  = os.getenv("MYSQL_PASSWORD", "password")
    MYSQL_DB        = os.getenv("MYSQL_DB", "resourcemesh")
    REDIS_HOST      = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT      = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB        = int(os.getenv("REDIS_DB", 0))
    PORT            = int(os.getenv("PORT", 5000))


def get_db_connection():
    try:
        conn = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False,
            connect_timeout=5,
        )
        return conn
    except pymysql.Error as e:
        logger.error(f"[DB] Connection failed: {e}")
        raise


def _decode_json_fields(row):
    if not row:
        return row
    result = {}
    for k, v in row.items():
        if isinstance(v, (bytes, bytearray)):
            v = v.decode('utf-8')
        if isinstance(v, str) and len(v) > 0 and v[0] in ('{', '['):
            try:
                result[k] = json.loads(v)
            except Exception:
                result[k] = v
        else:
            result[k] = v
    return result


def query_db(sql, args=(), one=False, commit=False):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            if commit:
                conn.commit()
                return cur.lastrowid
            rows = cur.fetchall()
            rows = [_decode_json_fields(r) for r in rows]
            if one:
                return rows[0] if rows else None
            return rows
    except pymysql.Error as e:
        if commit:
            conn.rollback()
        logger.error(f"[DB] Query error: {e}\nSQL: {sql}")
        raise
    finally:
        conn.close()


def execute_many(sql, data):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.executemany(sql, data)
        conn.commit()
    except pymysql.Error as e:
        conn.rollback()
        logger.error(f"[DB] executemany error: {e}")
        raise
    finally:
        conn.close()


_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=Config.REDIS_HOST,
                port=Config.REDIS_PORT,
                db=Config.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            _redis_client.ping()
            logger.info("[Redis] Connected")
        except redis.RedisError as e:
            logger.warning(f"[Redis] Unavailable - caching disabled: {e}")
            _redis_client = None
    return _redis_client


def cache_get(key):
    r = get_redis()
    if not r:
        return None
    try:
        val = r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_set(key, value, ttl=300):
    r = get_redis()
    if not r:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"[Redis] cache_set failed: {e}")


def cache_delete(key):
    r = get_redis()
    if not r:
        return
    try:
        r.delete(key)
    except Exception:
        pass


def cache_delete_pattern(pattern):
    r = get_redis()
    if not r:
        return
    try:
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
    except Exception:
        pass
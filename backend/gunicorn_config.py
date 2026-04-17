"""
Gunicorn configuration for LDO-2 EDMS Django backend
Production-ready settings with worker management and logging
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8420"
backlog = 2048
timeout = 30
keepalive = 5

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = os.path.join(os.path.dirname(__file__), "logs/access.log")
errorlog = os.path.join(os.path.dirname(__file__), "logs/error.log")
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "edms-backend"

# Server mechanics
daemon = False
pidfile = os.path.join(os.path.dirname(__file__), "gunicorn.pid")
tmp_upload_dir = None
umask = 0o022
user = None
group = None

# SSL (if needed)
keyfile = None
certfile = None
ssl_version = "TLSv1_2"
ciphers = "TLSv1"

# Application
wsgi_app = "edms.wsgi:application"
reload = False
reload_extra_files = []
chdir = None

# Server hooks
def on_starting(server):
    """Hook called when the Gunicorn server is starting."""
    os.makedirs(os.path.dirname(accesslog), exist_ok=True)
    os.makedirs(os.path.dirname(errorlog), exist_ok=True)

def when_ready(server):
    """Hook called when the Gunicorn server is ready to accept connections."""
    print("✓ EDMS Backend is ready on 0.0.0.0:8420")

def on_exit(server):
    """Hook called when the Gunicorn server exits."""
    print("✓ EDMS Backend shutdown complete")

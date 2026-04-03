import logging
import json
from datetime import datetime, timezone

from .request_context import get_correlation_id, get_plant_id, get_tenant_id


class RequestContextFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = get_correlation_id() or '-'
        record.tenant_id = get_tenant_id() or '-'
        record.plant_id = get_plant_id() or '-'
        return True


class JsonLogFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'correlation_id': getattr(record, 'correlation_id', '-'),
            'tenant_id': getattr(record, 'tenant_id', '-'),
            'plant_id': getattr(record, 'plant_id', '-'),
            'module': record.module,
            'line': record.lineno,
        }
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)

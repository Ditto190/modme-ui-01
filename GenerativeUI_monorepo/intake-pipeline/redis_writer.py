import os
import json
from typing import List
from metrics_schema import SessionMetric


def write_metrics_jsonl(metrics: List[dict], out_path: str, use_redis: bool = False):
    # fallback: write JSON-lines file
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as fh:
        for m in metrics:
            fh.write(json.dumps(m) + '\n')

    if use_redis:
        try:
            import redis
            r_url = os.environ.get('REDIS_URL')
            if not r_url:
                print('REDIS_URL not set; skipping Redis push')
                return
            client = redis.from_url(r_url)
            for m in metrics:
                client.xadd('session_metrics', {'json': json.dumps(m)})
            print(f'Pushed {len(metrics)} metrics to Redis stream session_metrics')
        except Exception as e:
            print('Redis push failed:', e)

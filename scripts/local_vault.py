#!/usr/bin/env python3
"""Simple local vault for secret storage with rotate/export support.

Requires: `pip install cryptography` (or `pip install --user cryptography`)

Usage:
  python scripts/local_vault.py init
  python scripts/local_vault.py set NAME VALUE
  python scripts/local_vault.py get NAME
  python scripts/local_vault.py list
  python scripts/local_vault.py rotate NAME
  python scripts/local_vault.py export-env --out .env

The vault stores encrypted JSON at `.vault/secrets.enc` and the key at `.vault/key`.
"""

import argparse
import base64
import json
import secrets
from pathlib import Path

try:
    from cryptography.fernet import Fernet
except Exception:
    print("Please install dependencies: pip install cryptography")
    raise

VAULT_DIR = Path('.vault')
KEY_FILE = VAULT_DIR / 'key'
SECRETS_FILE = VAULT_DIR / 'secrets.enc'


def init_vault():
    VAULT_DIR.mkdir(exist_ok=True)
    if not KEY_FILE.exists():
        key = Fernet.generate_key()
        KEY_FILE.write_bytes(key)
        print(f'Created key at {KEY_FILE}')
    else:
        print('Key already exists')
    if not SECRETS_FILE.exists():
        f = Fernet(KEY_FILE.read_bytes())
        SECRETS_FILE.write_bytes(f.encrypt(json.dumps({}).encode()))
        print(f'Created empty vault at {SECRETS_FILE}')
    else:
        print('Vault already exists')


def get_fernet():
    if not KEY_FILE.exists():
        raise SystemExit('Vault not initialized. Run: python scripts/local_vault.py init')
    return Fernet(KEY_FILE.read_bytes())


def load_secrets():
    f = get_fernet()
    data = SECRETS_FILE.read_bytes()
    try:
        raw = f.decrypt(data)
    except Exception:
        raise SystemExit('Failed to decrypt vault: key mismatch or corrupt file')
    return json.loads(raw.decode())


def save_secrets(d):
    f = get_fernet()
    SECRETS_FILE.write_bytes(f.encrypt(json.dumps(d).encode()))


def cmd_set(name, value):
    d = load_secrets()
    d[name] = value
    save_secrets(d)
    print(f'Set {name}')


def cmd_get(name):
    d = load_secrets()
    if name in d:
        print(d[name])
    else:
        raise SystemExit('Not found')


def cmd_list():
    d = load_secrets()
    for k in sorted(d.keys()):
        print(k)


def cmd_rotate(name):
    d = load_secrets()
    new = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    d[name] = new
    save_secrets(d)
    print(f'Rotated {name} -> {new}')


def cmd_export_env(out_path='.env'):
    d = load_secrets()
    lines = []
    for k, v in d.items():
        lines.append(f"{k}={v}")
    Path(out_path).write_text('\n'.join(lines) + '\n')
    print(f'Exported {len(d)} secrets to {out_path}')


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd')
    sub.add_parser('init')
    sset = sub.add_parser('set')
    sset.add_argument('name')
    sset.add_argument('value')
    sget = sub.add_parser('get')
    sget.add_argument('name')
    sub.add_parser('list')
    srot = sub.add_parser('rotate')
    srot.add_argument('name')
    sexp = sub.add_parser('export-env')
    sexp.add_argument('--out', default='.env')

    args = p.parse_args()
    if args.cmd == 'init':
        init_vault()
    elif args.cmd == 'set':
        cmd_set(args.name, args.value)
    elif args.cmd == 'get':
        cmd_get(args.name)
    elif args.cmd == 'list':
        cmd_list()
    elif args.cmd == 'rotate':
        cmd_rotate(args.name)
    elif args.cmd == 'export-env':
        cmd_export_env(args.out)
    else:
        p.print_help()


if __name__ == '__main__':
    main()

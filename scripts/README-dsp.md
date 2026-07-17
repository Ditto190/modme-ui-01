# DSP CLI (`scripts/dsp-cli.py`)

Data Structure Protocol — filesystem-backed dependency graph for agent structural memory (`.dsp/` directory).

## Agent workflow

1. Bootstrap observability subgraph: `yarn dsp:observability:bootstrap`
2. Inspect graph stats: `yarn dsp:observability:stats`
3. Mutate via CLI: `python scripts/dsp-cli.py --root . create-object ...`

## Tests

```powershell
yarn test:scripts:python
```

Coverage: Store, RevCache, Engine graph ops, CLI dispatch (`scripts/tests/test_dsp_cli.py`).

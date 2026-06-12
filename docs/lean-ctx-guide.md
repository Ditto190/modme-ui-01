# AI Agent Guide: LeanCTX Optimization

This document serves as the canonical knowledge base for AI agents operating within this repository to understand and leverage the **lean-ctx** token optimization layer.

> [!TIP]
> `lean-ctx` operates automatically via proxy or native shell hooks. You do not need to manually compress content before reading files. Just run standard tools, and `lean-ctx` will optimize the output.

## Core Concepts

`lean-ctx` works by dynamically intercepting requests (like `cat`, `ls`, or native IDE API calls) and compressing the output before it reaches the AI context window. This prevents token overflow, saves API costs, and keeps the AI focused on relevant code elements.

### Read Modes

When reading files (or if you are explicitly invoking `lean-ctx read <file> --mode <mode>`), there are three primary compression strategies:

1. **`aggressive`**: Best for text files, configs (`json`, `md`, `css`). Strips out unnecessary whitespace, comments, and redundant formatting.
2. **`map`**: Best for understanding repository structure and large code files (`ts`, `tsx`). Extracts the structural skeleton: dependencies, exports, and high-level class definitions, hiding the implementation logic. Extremely fast and saves ~95% tokens.
3. **`signatures`**: Best for inspecting code files where you only need the API surface (`ts`, `py`, `js`). Leaves function names, types, and parameters but strips out the function body.

## Configuration & Tuning

The global `lean-ctx` settings are located at `~/.config/lean-ctx/config.toml`. Key tunable variables include:

- `proxy.compression_level`: Defaults to `"max"`. If you are losing crucial detail in minified files or heavily templated components, instruct the user to lower this to `"balanced"`.
- `extra_ignore_patterns`: A list of globs (e.g., `"node_modules/**"`, `"dist/**"`). `lean-ctx` will completely ignore these directories, speeding up parsing.

## Diagnostics & Telemetry

As an AI agent, you can verify the status and usefulness of `lean-ctx` using the following CLI commands:

- `lean-ctx gain`: Displays a summary card of tokens saved, compression ratio, and estimated USD cost avoided.
- `lean-ctx gain --wrapped`: Generates a condensed, shareable card of the overall session savings.
- `lean-ctx benchmark`: Scans the current directory, tests all compression modes, and provides a breakdown of potential savings by file type.
- `lean-ctx doctor`: Verifies the installation, proxy connections, and IDE integration status.

> [!WARNING]
> If a shell command throws a `lean-ctx` related error or proxy refusal, check the `lean-ctx doctor` output. You can temporarily bypass compression by prefixing commands with `LEAN_CTX_DISABLED=1`.

## Fallback Protocols

If you suspect `lean-ctx` is stripping out too much information (for example, if you need the actual body implementation of a heavily compressed function):
1. Recommend modifying the mode to `raw` or temporarily turning it off: `lean-ctx off`.
2. Or read the file bypassing `lean-ctx` entirely using standard tools if the proxy is bypassed.

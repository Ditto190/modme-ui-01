{
  description = "ModMe dual-monorepo dev shell — node, yarn, bun for orchestration scripts";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            bun
            git
            tmux
            corepack
          ];
          shellHook = ''
            corepack enable 2>/dev/null || true
            corepack prepare yarn@3.3.0 --activate 2>/dev/null || true
            echo "[nix] ModMe devShell — yarn worktree:doctor | yarn harness:control-cli"
          '';
        };

        packages.worktree-smoke = pkgs.writeShellScriptBin "worktree-smoke" ''
          cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
          node e2e/worktree-smoke/run.mjs
        '';
      });
}

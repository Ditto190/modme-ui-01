{
  description = "ModMe monorepo — reproducible Node/Bun/Yarn toolchain";

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
          packages = with pkgs; [
            nodejs_22
            bun
            corepack
            git
          ];

          shellHook = ''
            export MODME_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
            corepack enable 2>/dev/null || true
            corepack prepare yarn@3.3.0 --activate 2>/dev/null || true
            echo "ModMe nix devShell — node $(node -v), bun $(bun --version 2>/dev/null || echo n/a)"
            echo "  Root orchestration: yarn (Corepack 3.3.0)"
            echo "  next-forge:         bun install / bunx (from next-forge/)"
            echo "  GenerativeUI:       yarn (from GenerativeUI_monorepo/)"
          '';
        };

        formatter = pkgs.nixpkgs-fmt;
      });
}

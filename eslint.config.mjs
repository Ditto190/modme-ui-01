import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".venv/**",
      "agent/.venv/**",
      "**/__pycache__/**",
      "**/venv/**",
      "data/**",
      "test_output/**",
      "test-mcp-validation/**",
    ],
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}", "agent-generator/**/*.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];

export default eslintConfig;

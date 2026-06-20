module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/embeddings/setup.ts"],
  collectCoverageFrom: [
    "embeddings/**/*.ts",
    "!embeddings/**/*.test.ts",
    "!embeddings/setup.ts",
  ],
  coverageDirectory: "coverage",
  verbose: true,
};

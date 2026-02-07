module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: ["eslint:recommended", "google", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: ["/lib/**/*"],
  plugins: ["@typescript-eslint"],
  rules: {
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    quotes: ["error", "double"],
    indent: ["error", 2],
    "max-len": "off",
    "object-curly-spacing": ["error", "always"],
    "@typescript-eslint/no-explicit-any": "error",
  },
};

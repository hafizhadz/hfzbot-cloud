export default [
  {
    ignores: ["dist/", "auth_state/", "node_modules/"],
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": "warn",
      "require-await": "warn",
    },
  },
]

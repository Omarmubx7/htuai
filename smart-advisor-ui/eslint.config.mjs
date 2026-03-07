import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore scripts and utility files (uses CommonJS)
    "scripts/**",
    "*.js",
  ]),
  // Override specific rules for pragmatic development
  {
    rules: {
      // Downgrade no-explicit-any from error to warning (type casts in session/auth are common)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused variables prefixed with _ (common pattern for intentional ignores)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;

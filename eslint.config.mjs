import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Over-strict for typical Next.js pages (init/loadAll after useState); keep other hook rules.
      "react-hooks/immutability": "off",
      // Syncing UI from localStorage / layout on mount is valid; rule flags many real patterns.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "e2e/**",
    // Accidental nested copy of the repo (duplicate app tree); lint the root only.
    "hemsaga/**",
    "playwright.config.js",
  ]),
]);

export default eslintConfig;

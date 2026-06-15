// Flat config. eslint-config-next 16 ships a native flat config array, so we
// spread it directly (no FlatCompat shim needed).
import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "graphify-out/**",
      "composer-worker/**",
      "public/sw.js",
    ],
  },
  ...next,
  {
    // eslint-config-next 16 enables the React-Compiler-era react-hooks rules as
    // errors. They flag idiomatic existing patterns (state init from an effect,
    // matchMedia sync, animation-key bumps) across this codebase. Keep them as
    // warnings — visible and addressable, but not a blocking gate — so `pnpm
    // lint` errors only on genuine problems. Revisit once the codebase migrates
    // toward the compiler's purity model.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;

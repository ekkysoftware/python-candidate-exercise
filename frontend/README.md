# React + TypeScript + Vite

## CRM data layer

The CRM screen uses `@tanstack/react-query` v5 for server-state caching,
revalidation, and mutation propagation. See [REACT_QUERY.md](../REACT_QUERY.md)
for an overview and the trade-offs of this approach.

Use the v5 API conventions in this project: object-form `useQuery`/
`useMutation`, `gcTime` (not `cacheTime`), and `isPending` (not `isLoading`)
for foreground state. Devtools load only under `import.meta.env.DEV`.

Commands:

```bash
npm install
npm run dev    # Vite dev server with the Django API proxy
npm run build  # tsc -b + production build into crm/static/crm/dist
npm run lint
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

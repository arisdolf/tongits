# React + Vite

## YouTube music search

Song search uses the YouTube Data API v3. Copy `.env.example` to `.env`, set
`VITE_YT_API_KEY` to an API key with YouTube Data API v3 enabled, then restart
the Vite dev server. For production, add the same variable to the hosting
provider's build environment and redeploy; Vite embeds `VITE_` values when it
builds the site. Restrict the key to YouTube Data API v3 and the site's allowed
HTTP referrers. A YouTube video link can still be queued without search.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

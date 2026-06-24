# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A pnpm monorepo (`packages/*`, `examples/*`) that does two things at once:
1. Publishes a set of utility libraries under the `@wenonly/*` scope (React components, React hooks, utils, etc.).
2. Hosts a VitePress documentation site (Chinese-language, deployed to `https://wenonly.github.io/kit/`) that doubles as a component showcase, demo gallery, and blog.

## Commands

```shell
pnpm install              # install (requires pnpm@9, see packageManager in package.json)
pnpm dev                  # VitePress dev server for the docs site
pnpm build                # build ALL packages (pnpm -r run build) THEN build docs
pnpm build:docs           # build only the VitePress site
pnpm preview              # preview the built docs
pnpm -r run build         # build every workspace package only
pnpm --filter @wenonly/utils build   # build a single package

# Versioning & publishing (changesets)
pnpm changeset            # generate a changeset
pnpm changeset version    # apply changesets, bump versions
pnpm changeset publish    # publish to npm
```

There is no lint script and no test runner at the root. Only `packages/loadYamlConfig` has a `test` script (`tsc` + run the example). Do not assume `pnpm test` works repo-wide.

Formatting: Prettier with `printWidth: 80`, double quotes, trailing comma `all`, `proseWrap: "never"` (see `.prettierrc`).

## Critical gotcha: `docs/` is build output, NOT source

VitePress `outDir` is `./docs` (see `.vitepress/config.mts`). The `docs/` directory at the repo root is the **generated site** that gets deployed to GitHub Pages — never edit it by hand. Actual content sources are:

- `pages/*.md` — top-level pages (home, tag, archive, works), rewritten to root URLs.
- `posts/<category>/<name>/README.md` — blog posts.
- `examples/{<category>}*/<name>/README.md` — demo showcase entries.
- `packages/<pkg>/src/...` READMEs — library API docs (components, hooks, utils).

`srcExclude` in the VitePress config also ignores `public/**/*.md` and `docs/**/*.md`.

## Architecture

### Build pipeline for packages

Each publishable package under `packages/` has its own `rollup.config.ts` and is built with `rollup --config rollup.config.ts --configPlugin typescript`. Output goes to `lib/` (ESM `.js` + `.d.ts`; some also emit CJS). React/axios/etc. are listed as `peerDependencies` and marked `external` in rollup. Inter-package deps use `workspace:^`.

### The rewrites system is the spine of the docs (`.vitepress/configs/`)

`rewrites.ts` defines pattern rules (`rewritesConfig`) that map source README paths to clean output URLs, grouped by `DocGroup` enum (`ReactComponents`, `ReactHooks`, `Utils`, `OtherUtils`, `Demo`, `Blog`). `generateFullRewrites()` scans **every** `.md` in the repo (`configs/files.ts`, via `fast-glob`), matches each against the patterns, reads its gray-matter frontmatter, and produces final rewrite entries. `getSideBar(group)` builds sidebars; `blog.ts` further groups blog posts by category and year-month for nav/sidebar.

**Consequence:** adding a new component/hook/util/demo/post = create the source file with correct frontmatter and it automatically appears in the right URL, sidebar, and nav. The frontmatter keys that matter are `title`, `categories`, `date` (posts), and `tags`.

Frontmatter conventions:
- Blog posts (`posts/.../README.md`): `title`, `categories` (top-level folder), `date` (drives year grouping), optional `tags`.
- Demos (`examples/.../README.md`): `title`, `categories`.

### Custom VitePress plugins (`.vitepress/plugins/`)

These four plugins implement the non-standard markdown/import features documented in the root README:

- **`tsParamsPlugin.ts`** — markdown fence rule. The syntax `<<< @/path/to/file.ts::params:InterfaceName` parses the TS file with `ts-morph`, extracts the named `interface`, and renders its properties as an HTML params table (key/type/description). Used to auto-generate API tables from source types.
- **`resolveConfigVitePlugin.ts`** — provides the virtual module `config:blog` (typed in `.vitepress/global.d.ts`), so themes/pages can `import blogConfig from "config:blog"`.
- **`resolveDemoVitePlugin.ts`** — the `?viewer` import suffix. Importing `./index.html?viewer` bundles the HTML (via `vite-plugin-singlefile`) into a self-contained string, records its dependency files for HMR, and emits a JSONP-wrapped asset (using the `jsonp-data` package) so demos can be embedded cross-origin. Returns `{ source: <url> }`.
- **`generateAssetsIndex.ts`** — at `buildStart` (and on file changes in dev), scans `.vitepress/theme/assets/works/` and writes `works.ts` exporting an `imagesMap`. Used by the "我的项目" (works) page. That assets dir is a git submodule.

### React inside Vue (VitePress)

VitePress is Vue-based, but the component library is React. `@wenonly/react-in-vue` (registered globally as `<VueWrapper>` in `.vitepress/theme/index.ts`) bridges this: component READMEs do `<VueWrapper :component={ReactComponent} />` to render live React demos. React demo files live in `examples/react/R*.tsx` and are imported from Markdown `<script setup>` blocks.

### Tailwind v4 + Element Plus auto-import

`@tailwindcss/vite` is a Vite plugin (Tailwind v4, no config file needed). Element Plus components/APIs are auto-resolved via `unplugin-auto-import` + `unplugin-vue-components` (`ElementPlusResolver`). Generated declaration files: `auto-imports.d.ts`, `components.d.ts`.

## Git submodules — clone recursively

Several directories are submodules (`.gitmodules`): `packages/html-viewer`, `packages/json2ts`, `packages/jsonp-data`, `.vitepress/theme/assets/works` (the "experience" repo), and `resume`. The GitHub Actions workflow checks out with `submodules: 'recursive'` and a `PAT_TOKEN`. Locally, use `git submodule update --init --recursive` after clone.

## Deployment

`.github/workflows/build_deploy.yml` runs on push to `main`: installs pnpm, runs `pnpm run build` (packages + docs), and deploys the `./docs` output to GitHub Pages. Site base path is `/kit/`.

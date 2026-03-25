<div align="center">

![FillKit](https://raw.githubusercontent.com/fillkit/sdk/main/media/logo-rect.svg)

**Context-aware form autofill — browser bundle**

[![npm version](https://badge.fury.io/js/@fillkit%2Fbrowser.svg)](https://www.npmjs.com/package/@fillkit/browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

Standalone browser bundles for [FillKit](https://fillkit.dev). Drop a single `<script>` tag into any page to get context-aware form autofill with realistic data — no build step required. Recognizes 100+ field types across 50+ languages.

Prefer a zero-code approach? Use the browser extension instead:

<div align="center">

<a href="https://chrome.google.com/webstore/detail/fillkit/"><img src="https://raw.githubusercontent.com/fillkit/sdk/main/media/chrome.svg" width="24" alt="Chrome">&nbsp;&nbsp;Chrome Extension</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://addons.mozilla.org/en-US/firefox/addon/fillkit/"><img src="https://raw.githubusercontent.com/fillkit/sdk/main/media/firefox.svg" width="24" alt="Firefox">&nbsp;&nbsp;Firefox Add-on</a>

</div>

## Usage

```html
<script src="https://unpkg.com/@fillkit/browser/fillkit.iife.js"></script>
<script>
  const fk = await FillKit.FillKit.init({ mode: 'valid', ui: { enabled: true } });
  await fk.autofillAll();
</script>
```

Alternative CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@fillkit/browser/fillkit.iife.js"></script>
```

## Bundles

| File              | Format | Use case                     |
| ----------------- | ------ | ---------------------------- |
| `fillkit.iife.js` | IIFE   | `<script>` tag (recommended) |
| `fillkit.umd.js`  | UMD    | AMD / CommonJS / global      |

## Using a bundler?

Use [`@fillkit/core`](https://www.npmjs.com/package/@fillkit/core) instead — it's tree-shakeable and doesn't bundle Faker.js.

```bash
npm install @fillkit/core
```

## Docs

Full API reference at [fillkit.dev/docs](https://fillkit.dev/docs).

## License

[MIT](./LICENSE)

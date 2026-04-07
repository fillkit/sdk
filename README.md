<div align="center">

![FillKit](./media/logo-rect.svg)

**Context-aware form autofill with realistic data**

[![npm version](https://badge.fury.io/js/@fillkit%2Fcore.svg)](https://www.npmjs.com/package/@fillkit/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

---

FillKit reads page structure, labels, and surrounding context to detect what each field expects — then fills it with realistic, coherent data. A checkout form gets a valid card number, matching expiry, and billing address in the same city. A signup form gets a real-looking name, email, and strong password. It recognizes 100+ field types across 50+ languages and generates both valid and intentionally invalid values for edge-case testing.

Use it as a **browser extension** for instant one-click filling, or **embed the SDK** into your app for programmatic control in tests, demos, and development workflows.

<div align="center">

<a href="https://chromewebstore.google.com/detail/fillkit/lajjifnmncbjbdkcakmbikjanofilmld"><img src="./media/chrome.svg" width="32" alt="Chrome">&nbsp;&nbsp;Chrome Extension</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://addons.mozilla.org/en-US/firefox/addon/fillkit/"><img src="./media/firefox.svg" width="32" alt="Firefox">&nbsp;&nbsp;Firefox Add-on</a>

</div>

## Install the SDK

```bash
npm install @fillkit/core
```

## Quick Start

```typescript
import { FillKit } from '@fillkit/core';

const fk = await FillKit.init({ mode: 'valid', ui: { enabled: true } });
await fk.autofillAll();
```

## Docs

Full API reference, configuration options, and framework guides at [fillkit.dev/docs](https://fillkit.dev/docs).

## Intended Use

FillKit is designed exclusively for **development**, **QA testing**, and **demo environments**. All generated data is synthetic — realistic but entirely fake. FillKit is not intended for filling real forms with real personal information.

## Privacy & Terms

FillKit SDK operates entirely on your device by default. No form data is collected or transmitted. See our [Privacy Policy](https://fillkit.dev/privacy) and [Terms of Service](https://fillkit.dev/terms) for full details.

## License

[MIT](./LICENSE)

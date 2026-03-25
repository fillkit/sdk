# @fillkit/browser

Browser bundles for FillKit - IIFE and UMD builds for CDN and direct browser usage.

## Installation

### Via CDN (unpkg)

```html
<!-- IIFE (Immediately Invoked Function Expression) -->
<script src="https://unpkg.com/@fillkit/browser@0.0.1/fillkit.iife.js"></script>
<script>
  // FillKit is available globally as window.FillKit
  const fk = new FillKit.FillKit({
    provider: 'local',
  });

  fk.autofillAll();
</script>
```

### Via CDN (jsDelivr)

```html
<script src="https://cdn.jsdelivr.net/npm/@fillkit/browser@0.0.1/fillkit.iife.js"></script>
```

### Via npm (for self-hosting)

```bash
npm install @fillkit/browser
```

Then copy `node_modules/@fillkit/browser/fillkit.iife.js` to your static files.

## Usage

Once loaded, FillKit is available as a global variable:

```javascript
// Create instance
const fk = new FillKit.FillKit({
  provider: 'local',
  locale: 'en_US',
  mode: 'valid',
});

// Fill all forms on the page
fk.autofillAll();

// Fill specific form
const form = document.querySelector('#my-form');
fk.autofill(form);

// Clear all forms
fk.clearAll();
```

## Bundles Included

- **fillkit.iife.js** - IIFE format (recommended for CDN)
- **fillkit.umd.js** - UMD format (works with AMD/CommonJS/global)

## For Node.js/Bundler Usage

If you're using a bundler (Vite, webpack, etc.) or Node.js, use the main package instead:

```bash
npm install @fillkit/core
```

See [@fillkit/core](https://www.npmjs.com/package/@fillkit/core) for more details.

## License

FillKit Source Available License - See LICENSE file for details.

## Links

- [Website](https://fillkit.dev)
- [Documentation](https://fillkit.dev/docs)
- [GitHub](https://github.com/fillkit/sdk)

# create-carto-frontsite

Create a standalone storefront backed by the Carto Private Commerce API.

```sh
npm create carto-frontsite@latest my-store
```

The same command works in macOS/Linux terminals, Windows PowerShell, and Command Prompt.
Project paths may contain spaces or non-ASCII characters; quote a path that contains spaces:

```powershell
npm create carto-frontsite@latest "C:\Users\me\My Store"
```

To select a Starter explicitly:

```sh
npm create carto-frontsite@latest my-store -- --template single-product
```

The command reads the current Starter catalog from `starters.json` and downloads the official
[`carto-frontsite-single-product-starter`](https://github.com/miguba/carto-frontsite-single-product-starter)
release without requiring Git. The generated source belongs to the user and
can be customized and deployed independently.

## Local development

```sh
npm install
node bin/create-carto-frontsite.js ../my-store
```

The test suite runs on Windows, macOS, and Linux in CI with Node.js 20, 22, and 24.

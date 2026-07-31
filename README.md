# create-carto-frontsite

Create a standalone storefront backed by the Carto Private Commerce API.

```sh
npm create carto-frontsite@latest my-store
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

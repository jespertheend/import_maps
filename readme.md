# Import maps

This module is a JavaScript implementation of the
[Import maps](https://html.spec.whatwg.org/multipage/webappapis.html#import-maps) spec.

## Usage

```js
import { parseImportMap, resolveModuleSpecifier } from "https://deno.land/x/import_maps/mod.js";

const baseUrl = new URL(import.meta.url);
const parsedImportMap = parseImportMap({
	imports: {
		"std/": "https://deno.land/std/",
	}
}, baseUrl);

const resolved = resolveModuleSpecifier(parsedImportMap, baseUrl, "std/http/mod.ts");
console.log(resolved); // URL { href: "https://deno.land/std/http/mod.ts" }
```

Alternatively, you can use `createEmptyImportMap()` to simulate a situation where no import map is provided.

```js
import { createEmptyImportMap, resolveModuleSpecifier } from "https://deno.land/x/import_maps/mod.js";

const importMap = createEmptyImportMap();
resolveModuleSpecifier(parsedImportMap, baseUrl, "https://example.com");
```

import { assertEquals } from "asserts";
import { resolveModuleSpecifier } from "../mod.js";

Deno.test({
	name: "resolveModuleSpecifier() with a https specifier",
	fn() {
		/** @type {import("../mod.js").ParsedImportMap} */
		const parsedImportMap = {
			imports: {
				"https://example.com/": new URL("file:///foo/bar/"),
			},
			scopes: {},
		};

		const baseUrl = new URL("file:///foo/script.js");

		const result = resolveModuleSpecifier(parsedImportMap, baseUrl, "https://example.com/test.js");
		assertEquals(result.href, "file:///foo/bar/test.js");
	},
});

Deno.test({
	name: "foo",
	fn() {
		/** @type {import("../mod.js").ParsedImportMap} */
		const parsedImportMap = {
			imports: {
				"$a/b/": new URL("file:///otherParent/a/b/"),
				"$a/": new URL("file:///parent/a/"),
			},
			scopes: {},
		};

		const baseUrl = new URL("file:///script.js");

		const result1 = resolveModuleSpecifier(parsedImportMap, baseUrl, "$a/test.js");
		assertEquals(result1.href, "file:///parent/a/test.js");
		const result2 = resolveModuleSpecifier(parsedImportMap, baseUrl, "$a/b/test.js");
		assertEquals(result2.href, "file:///otherParent/a/b/test.js");
	},
});

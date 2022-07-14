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
		};

		const baseUrl = new URL("file:///foo/script.js");

		const result = resolveModuleSpecifier(parsedImportMap, baseUrl, "https://example.com/test.js");
		assertEquals(result.href, "file:///foo/bar/test.js");
	},
});

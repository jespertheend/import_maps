/**
 * @module
 * Functions for parsing import maps and resolving identifiers.
 * https://wicg.github.io/import-maps/
 */

/**
 * @typedef ImportMapData
 * @property {Object.<string, string>} [imports]
 * @property {ImportMapScopesData} [scopes]
 */

/**
 * @typedef {Object.<string, ImportMapPotentialSpecifierMapData>} ImportMapScopesData
 */

/**
 * @typedef {Object.<string, string>} ImportMapPotentialSpecifierMapData
 */

/**
 * @typedef {Object.<string, URL?>} SpecifierMap
 */

/**
 * @typedef ParsedImportMap
 * @property {SpecifierMap} imports
 * @property {ParsedImportMapScopesData} scopes
 */

/**
 * @typedef {Record<string, ParsedImportMapScopesSpecifierMapData>} ParsedImportMapScopesData
 */

/**
 * @typedef {Record<string, URL | null>} ParsedImportMapScopesSpecifierMapData
 */

/**
 * @param {ImportMapData} input
 * @param {URL} baseUrl
 * @returns {ParsedImportMap}
 */
export function parseImportMap(input, baseUrl) {
	// 1. Let parsed be the result of parsing JSON into Infra values given input.
	/** @type {ImportMapData} */
	const parsed = input;

	// 2. If parsed is not a map, then throw a TypeError indicating that the top-level value needs to be a JSON object.
	if (typeof parsed != "object" || parsed === null || Array.isArray(parsed)) {
		throw new TypeError("The top-level value needs to be a JSON object.");
	}

	// 3. Let sortedAndNormalizedImports be an empty map.
	/** @type {SpecifierMap} */
	let sortedAndNormalizedImports = {};

	// 4. If parsed["imports"] exists, then:
	if (parsed.imports) {
		// 1. If parsed["imports"] is not a map, then throw a TypeError indicating that the "imports" top-level key needs to be a JSON object.
		if (
			typeof parsed.imports != "object" || parsed.imports === null ||
			Array.isArray(parsed.imports)
		) {
			throw new TypeError(
				`The "imports" top-level key needs to be a JSON object.`,
			);
		}

		// 2. Set sortedAndNormalizedImports to the result of sorting and normalizing a specifier map given parsed["imports"] and baseURL.
		sortedAndNormalizedImports = sortAndNormalizeSpecifierMap(
			parsed.imports,
			baseUrl,
		);
	}

	// 5. Let sortedAndNormalizedScopes be an empty ordered map.
	/** @type {ParsedImportMapScopesData} */
	let sortedAndNormalizedScopes = {};

	// 6. If parsed["scopes"] exists, then:
	if (parsed.scopes) {
		// 1. If parsed["scopes"] is not an ordered map, then throw a TypeError indicating that the value for the "scopes" top-level key needs to be a JSON object.
		if (typeof parsed.scopes != "object") {
			throw new TypeError(`The value for the "scopes" property needs to be a JSON object.`);
		}

		// 2. Set sortedAndNormalizedScopes to the result of sorting and normalizing scopes given parsed["scopes"] and baseURL.
		sortedAndNormalizedScopes = sortAndNormalizeScopes(parsed.scopes, baseUrl);
	}

	// 7. If parsed’s keys contains any items besides "imports" or "scopes", report a warning to the console that an invalid top-level key was present in the import map.
	for (const key of Object.keys(parsed)) {
		if (key != "imports" && key != "scopes") {
			console.warn(
				`An invalid top-level key was present in the import map: ${key}`,
			);
		}
	}

	// 8. Return the import map whose imports are sortedAndNormalizedImports and whose scopes scopes are sortedAndNormalizedScopes.
	return {
		imports: sortedAndNormalizedImports,
		scopes: sortedAndNormalizedScopes,
	};
}

/**
 * @param {ImportMapPotentialSpecifierMapData} originalMap
 * @param {URL} baseURL
 */
function sortAndNormalizeModuleSpecifierMap(originalMap, baseURL) {
	// 1. Let normalized be an empty ordered map.
	/** @type {ParsedImportMapScopesSpecifierMapData} */
	const normalized = {};

	// 2. For each specifierKey → value of originalMap:
	for (const [specifierKey, value] of Object.entries(originalMap)) {
		// 1. Let normalizedSpecifierKey be the result of normalizing a specifier key given specifierKey and baseURL.
		const normalizedSpecifierKey = normalizeSpecifierKey(specifierKey, baseURL);

		// 2. If normalizedSpecifierKey is null, then continue.
		if (normalizedSpecifierKey == null) continue;

		// 3. If value is not a string, then:
		if (typeof value != "string") {
			// 1. The user agent may report a warning to the console indicating that addresses need to be strings.
			console.warn(`The value for ${specifierKey} is not a string. Scopes addresses need to be strings.`);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue
			continue;
		}

		// 4. Let addressURL be the result of resolving a URL-like module specifier given value and baseURL.
		const addressURL = resolveUrlLikeModuleSpecifier(value, baseURL);

		// 5. If addressURL is null, then:
		if (addressURL == null) {
			// 1. The user agent may report a warning to the console indicating that the address was invalid.
			console.warn(`The address "${value}" is invalid.`);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue.
			continue;
		}

		// 6. If specifierKey ends with U+002F (/), and the serialization of addressURL does not end with U+002F (/), then:
		if (specifierKey.endsWith("/") && !addressURL.href.endsWith("/")) {
			// 1. The user agent may report a warning to the console indicating that an invalid address was given for the specifier key specifierKey; since specifierKey ends with a slash, the address needs to as well.
			console.warn(
				`An invalid address was given for "${specifierKey}". Since the specifier ended in a slash, the address needs to as well.`,
			);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue.
			continue;
		}

		// 7. Set normalized[normalizedSpecifierKey] to addressURL.
		normalized[normalizedSpecifierKey] = addressURL;
	}

	// 3. Return the result of sorting in descending order normalized, with an entry a being less than an entry b if a's key is code unit less than b's key.
	const sortedEntries = sortObject(normalized);
	return sortedEntries;
}

/**
 * Creates an empty import map.
 */
export function createEmptyImportMap() {
	/** @type {ParsedImportMap} */
	const importMap = {
		imports: {},
		scopes: {},
	};
	return importMap;
}

/**
 * @param {Object.<string, string>} originalMap
 * @param {URL} baseUrl
 * @returns {SpecifierMap}
 */
function sortAndNormalizeSpecifierMap(originalMap, baseUrl) {
	// 1. Let normalized be an empty map.
	/** @type {Object.<string, URL?>} */
	const normalized = {};

	// 2. For each specifierKey → value of originalMap,
	for (const [specifierKey, value] of Object.entries(originalMap)) {
		// 1. Let normalizedSpecifierKey be the result of normalizing a specifier key given specifierKey and baseURL.
		const normalizedSpecifierKey = normalizeSpecifierKey(specifierKey, baseUrl);

		// 2. If normalizedSpecifierKey is null, then continue.
		if (normalizedSpecifierKey === null) continue;

		// 3. If value is not a string, then:
		if (typeof value != "string") {
			// 1. Report a warning to the console that addresses need to be strings.
			console.warn(
				`Addresses need to be strings but ${specifierKey} is not of type string.`,
			);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue.
			continue;
		}

		// 4. Let addressURL be the result of parsing a URL-like import specifier given value and baseURL.
		const addressURL = parseUrlLikeImportSpecifier(value, baseUrl);

		// 5. If addressURL is null, then:
		if (addressURL === null) {
			// 1. Report a warning to the console that the address was invalid.
			console.warn(`The address ${value} is invalid.`);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue.
			continue;
		}

		// 6. If specifierKey ends with U+002F (/), and the serialization of addressURL does not end with U+002F (/), then:
		if (specifierKey.endsWith("/") && !addressURL.href.endsWith("/")) {
			// 1. Report a warning to the console that an invalid address was given for the specifier key specifierKey; since specifierKey ended in a slash, the address needs to as well.
			console.warn(
				`An invalid address was given for "${specifierKey}". Since the specifier ended in a slash, the address needs to as well.`,
			);

			// 2. Set normalized[normalizedSpecifierKey] to null.
			normalized[normalizedSpecifierKey] = null;

			// 3. Continue.
			continue;
		}

		// 7. Set normalized[normalizedSpecifierKey] to addressURL.
		normalized[normalizedSpecifierKey] = addressURL;
	}

	// 3. Return the result of sorting in descending order normalized, with an entry a being less than an entry b if a's key is code unit less than b's key.
	/** @type {SpecifierMap} */
	const sortedEntries = sortObject(normalized);
	return sortedEntries;
}

/**
 * @param {ImportMapScopesData} originalMap
 * @param {URL} baseURL
 */
function sortAndNormalizeScopes(originalMap, baseURL) {
	// 1. Let normalized be an empty ordered map.
	/** @type {ParsedImportMapScopesData} */
	const normalized = {};

	// 2. For each scopePrefix → potentialSpecifierMap of originalMap:
	for (const [scopePrefix, potentialSpecifierMap] of Object.entries(originalMap)) {
		// 1. If potentialSpecifierMap is not an ordered map, then throw a TypeError indicating that the value of the scope with prefix scopePrefix needs to be a JSON object.
		if (typeof potentialSpecifierMap != "object" || potentialSpecifierMap == null) {
			throw new TypeError(`Value of the scope with prefix ${scopePrefix} is not a JSON object.`);
		}

		// 2. Let scopePrefixURL be the result of URL parsing scopePrefix with baseURL.
		let scopePrefixURL;
		try {
			scopePrefixURL = new URL(scopePrefix, baseURL);

			// 3. If scopePrefixURL is failure, then:
		} catch {
			// 1. The user agent may report a warning to the console that the scope prefix URL was not parseable.
			console.warn(`The scope prefix for ${scopePrefix} was not parseable.`);

			// 2. Continue
			continue;
		}

		// 4. Let normalizedScopePrefix be the serialization of scopePrefixURL.
		const normalizedScopePrefix = scopePrefixURL.href;

		// 5. Set normalized[normalizedScopePrefix] to the result of sorting and normalizing a module specifier map given potentialSpecifierMap and baseURL.
		normalized[normalizedScopePrefix] = sortAndNormalizeModuleSpecifierMap(potentialSpecifierMap, baseURL);
	}

	// 3. Return the result of sorting in descending order normalized, with an entry a being less than an entry b if a's key is code unit less than b's key.
	const sortedEntries = sortObject(normalized);
	return sortedEntries;
}

/**
 * @template T
 * @param {Record<string, T>} map
 */
function sortObject(map) {
	const sortedEntries = Object.entries(map).sort(([a], [b]) => {
		if (a < b) return -1;
		if (a > b) return 1;
		return 0;
	});
	/** @type {Record<string, T>} */
	const newSpecifierMap = {};
	for (const [key, value] of sortedEntries) {
		newSpecifierMap[key] = value;
	}
	return newSpecifierMap;
}

/**
 * @param {string} specifierKey
 * @param {URL} baseURL
 */
function normalizeSpecifierKey(specifierKey, baseURL) {
	// 1. If specifierKey is the empty string, then:
	if (specifierKey == "") {
		// 1. Report a warning to the console that specifier keys cannot be the empty string.
		console.warn("Specifier keys cannot be an empty string.");

		// 2. Return null.
		return null;
	}

	// 2. Let url be the result of parsing a URL-like import specifier, given specifierKey and baseURL.
	const url = parseUrlLikeImportSpecifier(specifierKey, baseURL);

	// 3. If url is not null, then return the serialization of url.
	if (url) return url.href;

	// 4. Return specifierKey.
	return specifierKey;
}

/**
 * @param {string} specifier
 * @param {URL} baseUrl
 */
function parseUrlLikeImportSpecifier(specifier, baseUrl) {
	// 1. If specifier starts with "/", "./", or "../", then:
	if (
		specifier.startsWith("/") || specifier.startsWith("./") ||
		specifier.startsWith("../")
	) {
		// 1. Let url be the result of parsing specifier with baseURL as the base URL.
		let url;
		try {
			url = new URL(specifier, baseUrl);
		} catch {
			// 2. If url is failure, then return null.
			return null;
		}

		// 3. Return url.
		return url;
	}

	// Let url be the result of parsing specifier (with no base URL).
	let url;
	try {
		url = new URL(specifier);
	} catch {
		// 2. If url is failure, then return null.
		return null;
	}

	// 3. Return url.
	return url;
}

/**
 * @param {ParsedImportMap} importMap
 * @param {URL} baseUrl
 * @param {string} specifier
 */
export function resolveModuleSpecifier(importMap, baseUrl, specifier) {
	// We'll skip step 1 - 4 and instead the import map and base url are taken
	// as parameters directly.

	// 6. Let baseURLString be baseURL, serialized.
	const baseURLString = new URL(baseUrl).href;

	// 7. Let asURL be the result of parsing a URL-like import specifier given specifier and baseURL.
	const asURL = parseUrlLikeImportSpecifier(specifier, baseUrl);

	// 8. Let normalizedSpecifier be the serialization of asURL, if asURL is non-null; otherwise, specifier.
	const normalizedSpecifier = asURL ? asURL.href : specifier;

	// 9. For each scopePrefix → scopeImports of importMap's scopes:
	for (const [scopePrefix, scopeImports] of Object.entries(importMap.scopes)) {
		// 1. If scopePrefix is baseURLString, or if scopePrefix ends with U+002F (/) and scopePrefix is a code unit prefix of baseURLString, then:
		if (scopePrefix == baseURLString || scopePrefix.endsWith("/") && baseURLString.startsWith(scopePrefix)) {
			// 1. Let scopeImportsMatch be the result of resolving an imports match given normalizedSpecifier, asURL, and scopeImports.
			const scopeImportsMatch = resolveImportsMatch(normalizedSpecifier, asURL, scopeImports);

			// 2. If scopeImportsMatch is not null, then return scopeImportsMatch.
			if (scopeImportsMatch != null) return scopeImportsMatch;
		}
	}

	// 10. Let topLevelImportsMatch be the result of resolving an imports match given normalizedSpecifier, asURL, and importMap’s imports.
	const topLevelImportsMatch = resolveImportsMatch(
		normalizedSpecifier,
		asURL,
		importMap.imports,
	);

	// 11. If topLevelImportsMatch is not null, then return topLevelImportsMatch.
	if (topLevelImportsMatch) return topLevelImportsMatch;

	// 12. If asURL is not null, then return asURL.
	if (asURL) return asURL;

	// 13. Throw a TypeError indicating that specifier was a bare specifier, but was not remapped to anything by importMap.
	throw new TypeError(
		`Relative import path "${specifier}" not prefixed with / or ./ or ../`,
	);
}

/**
 * @param {string} normalizedSpecifier
 * @param {URL?} asURL
 * @param {SpecifierMap} specifierMap
 */
function resolveImportsMatch(normalizedSpecifier, asURL, specifierMap) {
	// 1. For each specifierKey → resolutionResult of specifierMap,
	for (const [specifierKey, resolutionResult] of Object.entries(specifierMap)) {
		// 1. If specifierKey is normalizedSpecifier, then:
		if (specifierKey === normalizedSpecifier) {
			// 1. If resolutionResult is null, then throw a TypeError indicating that resolution of specifierKey was blocked by a null entry.
			if (resolutionResult === null) {
				throw new TypeError(
					`Resolution of ${specifierKey} was blocked by a null entry.`,
				);
			}

			// 2. Assert: resolutionResult is a URL.
			if (!(resolutionResult instanceof URL)) {
				throw new TypeError(
					`Resolution of ${specifierKey} was blocked by a non-URL entry.`,
				);
			}

			// 3. Return resolutionResult.
			return resolutionResult;
		}

		// 2. If all of the following are true:
		if (
			// * specifierKey ends with U+002F (/),
			specifierKey.endsWith("/") &&
			// * normalizedSpecifier starts with specifierKey, and
			normalizedSpecifier.startsWith(specifierKey) &&
			// * either asURL is null, or asURL is special
			(!asURL ||
				["ftp:", "file:", "http:", "https:", "ws:", "wss:"].includes(asURL.protocol))
		) {
			// 1. If resolutionResult is null, then throw a TypeError indicating that resolution of specifierKey was blocked by a null entry.
			if (resolutionResult === null) {
				throw new TypeError(
					`Resolution of ${specifierKey} was blocked by a null entry.`,
				);
			}

			// 2. Assert: resolutionResult is a URL.
			if (!(resolutionResult instanceof URL)) {
				throw new TypeError(
					`Resolution of ${specifierKey} was blocked by a non-URL entry.`,
				);
			}

			// 3. Let afterPrefix be the portion of normalizedSpecifier after the initial specifierKey prefix.
			const afterPrefix = normalizedSpecifier.slice(specifierKey.length);

			// 4. Assert: resolutionResult, serialized, ends with "/", as enforced during parsing.
			if (!resolutionResult.href.endsWith("/")) {
				throw new TypeError(
					`Assertion failed: The value of ${specifierKey} does not end with "/".`,
				);
			}

			// 5. Let url be the result of parsing afterPrefix relative to the base URL resolutionResult.
			let url;
			try {
				url = new URL(afterPrefix, resolutionResult);
			} catch {
				// 6. If url is failure, then throw a TypeError indicating that resolution of normalizedSpecifier was blocked since the afterPrefix portion could not be URL-parsed relative to the resolutionResult mapped to by the specifierKey prefix.
				throw new TypeError(
					`Resolution of ${normalizedSpecifier} was blocked since the afterPrefix portion could not be URL-parsed relative to the resolutionResult mapped to by the specifierKey prefix.`,
				);
			}

			// 7. Assert: url is a URL.
			if (!(url instanceof URL)) {
				throw new TypeError(`Assertion failed: url is not a URL.`);
			}

			// 8. If the serialization of url does not start with the serialization of resolutionResult, then throw a TypeError indicating that resolution of normalizedSpecifier was blocked due to it backtracking above its prefix specifierKey.
			if (!url.href.startsWith(resolutionResult.href)) {
				throw new TypeError(
					`Resolution of ${normalizedSpecifier} was blocked due to it backtracking above its prefix specifierKey.`,
				);
			}

			// 9. Return url.
			return url;
		}
	}

	// 2. Return null.
	return null;
}

/**
 * @param {string} specifier
 * @param {URL} baseURL
 */
function resolveUrlLikeModuleSpecifier(specifier, baseURL) {
	// 1. If specifier starts with "/", "./", or "../", then:
	if (specifier.startsWith("/") || specifier.startsWith("./") || specifier.startsWith("../")) {
		// 1. Let url be the result of URL parsing specifier with baseURL.
		let url;
		try {
			url = new URL(specifier, baseURL);
		} catch {
			// 2. If url is failure, then return null.
			return null;
		}

		// 3. Return url.
		return url;
	}

	// 2. Let url be the result of URL parsing specifier (with no base URL).
	let url;
	try {
		url = new URL(specifier);
	} catch {
		// 3. If url is failure, then return null.
		return null;
	}

	// 4. Return url.
	return url;
}

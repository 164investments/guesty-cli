// Compatibility entry point; guides stay in the ignored repository docs cache.
// Updating a separate knowledge base is an explicit, independent operation.
process.argv.push("--guides");
await import("./scrape-api-docs.mjs");

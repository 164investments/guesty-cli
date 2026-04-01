import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const marketing = new Command("marketing")
  .description("Marketing: translations, languages, and description sets");

marketing
  .command("list-fields <id>")
  .description("List marketing fields for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/marketing/fields/${id}`);
    print(data);
  });

marketing
  .command("list-channel-fields <id> <channel>")
  .description("List marketing fields for a listing channel")
  .action(async (id: string, channel: string) => {
    const data = await guestyFetch(`/v1/marketing/fields/${id}/channels/${channel}`);
    print(data);
  });

marketing
  .command("list-description-set-fields <id> <descriptionSetId>")
  .description("List marketing fields for a description set")
  .action(async (id: string, descriptionSetId: string) => {
    const data = await guestyFetch(`/v1/marketing/fields/${id}/description-sets/${descriptionSetId}`);
    print(data);
  });

marketing
  .command("upsert-translation <id>")
  .description("Upsert a marketing translation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/marketing/fields/${id}/upsert`, { method: "PUT", body });
    print(data);
  });

marketing
  .command("list-languages")
  .description("List all supported marketing languages")
  .action(async () => {
    const data = await guestyFetch("/v1/marketing/languages");
    print(data);
  });

marketing
  .command("get-listing-languages <id>")
  .description("Get languages configured for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/marketing/languages/${id}`);
    print(data);
  });

marketing
  .command("set-listing-languages <id>")
  .description("Set languages for a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/marketing/languages/${id}`, { method: "PUT", body });
    print(data);
  });

marketing
  .command("list-description-sets <listingId>")
  .description("List description sets for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/marketing/description-sets/${listingId}`);
    print(data);
  });

marketing
  .command("create-description-set")
  .description("Create a description set (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/marketing/description-sets", { method: "POST", body });
    print(data);
  });

marketing
  .command("update-description-set <id>")
  .description("Update a description set (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/marketing/description-sets/${id}`, { method: "PUT", body });
    print(data);
  });

marketing
  .command("delete-description-set <id>")
  .description("Delete a description set")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/marketing/description-sets/${id}`, { method: "DELETE" });
    print(data);
  });

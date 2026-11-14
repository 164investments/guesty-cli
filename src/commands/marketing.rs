//! Port of src/commands/marketing.ts.

use super::contacts::{fetch_print, js_body, method_print, send_data};
use crate::cli::{Call, Command};
use crate::client::{Fetch, guesty_fetch};
use crate::error::Result;
use crate::output::print;
use crate::params;
use crate::stdin;

/// `guestyFetch(path, { params: { language: opts.language } })`.
fn fields_in_language(c: &Call, path: &str) -> Result<()> {
    let params = params! { "language" => c.opts.str("language").unwrap_or("") };
    print(&guesty_fetch(path, Fetch::get(params))?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("marketing")
        .description("Marketing: translations, languages, and description sets")
        .command(
            Command::new("list-fields <id>")
                .description("List marketing fields for a listing")
                .option_default("--language <slug>", "Language slug, or all for every translation", "all")
                .action(|c| fields_in_language(c, &format!("/v1/marketing/fields/{}", c.arg(0)))),
        )
        .command(
            Command::new("list-channel-fields <id> <channel>")
                .description("List marketing fields for a listing channel")
                .option_default("--language <slug>", "Language slug, or all for every translation", "all")
                .action(|c| fields_in_language(c, &format!("/v1/marketing/fields/{}/channels/{}", c.arg(0), c.arg(1)))),
        )
        .command(
            Command::new("list-description-set-fields <id> <descriptionSetId>")
                .description("List marketing fields for a description set")
                .option_default("--language <slug>", "Language slug, or all for every translation", "all")
                .action(|c| {
                    fields_in_language(c, &format!("/v1/marketing/fields/{}/description-sets/{}", c.arg(0), c.arg(1)))
                }),
        )
        .command(
            Command::new("upsert-translation <id>")
                .description("Upsert a marketing translation (--data or stdin)")
                .required_option("--language <slug>", "Language slug for the translation")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    let fetch = Fetch {
                        method: "PUT".into(),
                        body: Some(js_body(body)),
                        params: Some(params! { "language" => c.opts.str("language").unwrap_or("") }),
                        ..Fetch::default()
                    };
                    print(&guesty_fetch(&format!("/v1/marketing/fields/{}/upsert", c.arg(0)), fetch)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("list-languages")
                .description("List all supported marketing languages")
                .action(|_| fetch_print("/v1/marketing/languages")),
        )
        .command(
            Command::new("get-listing-languages <id>")
                .description("Get languages configured for a listing")
                .action(|c| fetch_print(&format!("/v1/marketing/languages/{}", c.arg(0)))),
        )
        .command(
            Command::new("set-listing-languages <id>")
                .description("Set languages for a listing (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/marketing/languages/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("list-description-sets <listingId>")
                .description("List description sets for a listing")
                .action(|c| fetch_print(&format!("/v1/marketing/description-sets/{}", c.arg(0)))),
        )
        .command(
            Command::new("create-description-set")
                .description("Create a description set (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/marketing/description-sets", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update-description-set <id>")
                .description("Update a description set (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/marketing/description-sets/{}", c.arg(0)), "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("delete-description-set <id>")
                .description("Delete a description set")
                .action(|c| method_print(&format!("/v1/marketing/description-sets/{}", c.arg(0)), "DELETE")),
        )
}

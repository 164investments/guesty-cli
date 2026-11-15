//! Port of src/commands/payment-providers.ts.

use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::output::print;
use crate::stdin;

pub fn command() -> Command {
    Command::new("payment-providers")
        .alias("pp")
        .description("Manage payment providers")
        .command(Command::new("summary").description("Get payment providers summary").action(|_| {
            print(&get("/v1/payment-providers/summary", Params::new())?);
            Ok(())
        }))
        .command(Command::new("default").description("Get default payment provider").action(|_| {
            print(&get("/v1/payment-providers/default", Params::new())?);
            Ok(())
        }))
        .command(Command::new("stats").description("Get payment provider stats").action(|_| {
            print(&get("/v1/payment-providers/stats", Params::new())?);
            Ok(())
        }))
        .command(Command::new("get <providerId>").description("Get a payment provider by ID").action(|c| {
            print(&get(&format!("/v1/payment-providers/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(
            Command::new("by-listing")
                .description("Get payment provider by listing")
                .required_option("--listing <id>", "Listing ID")
                .action(|c| {
                    let mut params = Params::new();
                    if let Some(listing) = c.opts.str("listing").filter(|s| !s.is_empty()) {
                        params.set("listingId", listing);
                    }
                    print(&get("/v1/payment-providers/provider-by-listing", params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("assign-listings <id>")
                .description("Assign listings to a payment provider (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    let path = format!("/v1/payment-providers/{}/assign-listings", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("POST", body))?);
                    Ok(())
                }),
        )
}

//! Every command, in the order the Node CLI registered them (help lists them
//! in this order). Each module is a port of the matching `src/commands/*.ts`.

use crate::cli::Command;

pub mod query_options;

mod accounting;
mod accounts;
mod additional_fees;
mod address;
mod airbnb;
mod basic_fees;
mod block_logs;
mod booking_engine;
mod calendar;
mod channel_commission;
mod contacts;
mod conversations;
mod financials;
mod guest_app;
mod guest_code;
mod guests;
mod icalendar;
mod init;
mod integrations;
mod invoice_items;
mod join;
mod listings;
mod marketing;
mod mcp;
mod owners;
mod payment_providers;
mod payments;
mod price_adjustments;
mod promotions;
mod properties;
mod quotes;
mod rate_plans;
mod rate_strategies;
mod raw;
mod reservations;
mod reviews;
mod saved_replies;
mod setup;
mod tasks;
mod taxes;
mod team;
mod token;
mod user_scope;
mod users;
mod webhooks;

pub fn program() -> Command {
    Command::new("guesty")
        .version(env!("CARGO_PKG_VERSION"))
        .description("Guesty Open API and Booking Engine API CLI with read-only cached-token authentication. Named commands cover every documented endpoint, and 'raw' handles other Open API resource paths.")
        .command(init::command())
        .command(setup::command())
        .command(team::command())
        .command(join::command())
        .command(mcp::command())
        .command(reservations::command())
        .command(listings::command())
        .command(calendar::command())
        .command(guests::command())
        .command(conversations::command())
        .command(tasks::command())
        .command(financials::command())
        .command(reviews::command())
        .command(owners::command())
        .command(accounting::command())
        .command(properties::command())
        .command(quotes::command())
        .command(webhooks::command())
        .command(users::command())
        .command(integrations::command())
        .command(marketing::command())
        .command(taxes::command())
        .command(payment_providers::command())
        .command(channel_commission::command())
        .command(rate_strategies::command())
        .command(contacts::command())
        .command(icalendar::command())
        .command(saved_replies::command())
        .command(rate_plans::command())
        .command(additional_fees::command())
        .command(address::command())
        .command(promotions::command())
        .command(price_adjustments::command())
        .command(user_scope::command())
        .command(guest_app::command())
        .command(guest_code::command())
        .command(block_logs::command())
        .command(airbnb::command())
        .command(invoice_items::command())
        .command(accounts::command())
        .command(payments::command())
        .command(basic_fees::command())
        .command(booking_engine::command())
        .command(token::command())
        .command(raw::command())
        .command(
            Command::new("update")
                .description("Update guesty-cli to the latest version")
                .action(|_| crate::update::run_self_update()),
        )
        .command(contract_command())
        .command(test_update_check_command())
}

/// `guesty __test-update-check [count]` (test-hooks builds only): runs the
/// after-command update check `count` times, as tests of it need.
fn test_update_check_command() -> Command {
    let command = Command::new("__test-update-check [count]").hidden();
    #[cfg(feature = "test-hooks")]
    let command = command.action(|c| {
        let count = c.arg_opt(0).and_then(|n| n.parse::<u32>().ok()).unwrap_or(1);
        for _ in 0..count {
            crate::update::check_for_update();
        }
        Ok(())
    });
    command
}

/// `guesty __contract`: the command tree as JSON, for `guesty-cli-spec.json`.
fn contract_command() -> Command {
    Command::new("__contract").hidden().action(|_| {
        let program = program();
        crate::output::print_json(&crate::cli::contract(&program, &[]));
        Ok(())
    })
}

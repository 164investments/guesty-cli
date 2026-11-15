//! Port of src/commands/taxes.ts.

use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::output::print;
use crate::stdin;

pub fn command() -> Command {
    Command::new("taxes")
        .description("Manage taxes")
        .command(
            Command::new("create")
                .description("Create a tax (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    print(&guesty_fetch("/v1/taxes", Fetch::json("POST", body))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("update <id>")
                .description("Update a tax (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    print(&guesty_fetch(&format!("/v1/taxes/{}", c.arg(0)), Fetch::json("PATCH", body))?);
                    Ok(())
                }),
        )
        .command(Command::new("delete <id>").description("Delete a tax").action(|c| {
            print(&guesty_fetch(&format!("/v1/taxes/{}", c.arg(0)), Fetch::method("DELETE"))?);
            Ok(())
        }))
        .command(Command::new("account").description("Get account taxes").action(|_| {
            print(&get("/v1/taxes/account", Params::new())?);
            Ok(())
        }))
        .command(Command::new("unit-type <id>").description("Get unit type taxes").action(|c| {
            print(&get(&format!("/v1/taxes/unit-type/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(Command::new("unit-type-actual <id>").description("Get actual taxes for a unit type").action(|c| {
            print(&get(&format!("/v1/taxes/unit-type/{}/actual", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(
            Command::new("level-config-update")
                .description("Create or update tax level configuration (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    print(&guesty_fetch("/v1/taxes/level-configurations", Fetch::json("PUT", body))?);
                    Ok(())
                }),
        )
        .command(Command::new("level-config <id>").description("Get tax level configuration for a unit type").action(
            |c| {
                print(&get(&format!("/v1/taxes/level-configurations/unit-type/{}", c.arg(0)), Params::new())?);
                Ok(())
            },
        ))
}

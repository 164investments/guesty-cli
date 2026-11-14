//! Port of src/commands/users.ts.

use super::contacts::{fetch_print, method_print, send_data};
use crate::cli::Command;

pub fn command() -> Command {
    Command::new("users")
        .description("Manage users and roles")
        .command(Command::new("list").description("List all users").action(|_| fetch_print("/v1/users")))
        .command(
            Command::new("get <id>")
                .description("Get a user by ID")
                .action(|c| fetch_print(&format!("/v1/users/{}", c.arg(0)))),
        )
        .command(
            Command::new("create")
                .description("Create a user (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/users", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <id>")
                .description("Update a user (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/users/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("delete <id>")
                .description("Delete a user")
                .action(|c| method_print(&format!("/v1/users/{}", c.arg(0)), "DELETE")),
        )
        .command(Command::new("roles").description("Get available roles").action(|_| fetch_print("/v1/roles")))
        .command(
            Command::new("role <id>")
                .description("Get assigned roles by ID")
                .action(|c| fetch_print(&format!("/v1/roles/{}", c.arg(0)))),
        )
        .command(
            Command::new("assign-roles")
                .description("Assign roles (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/roles/assign", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("account")
                .description("Get current account details")
                .action(|_| fetch_print("/v1/accounts/me")),
        )
}

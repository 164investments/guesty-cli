//! Port of src/commands/setup.ts.

use crate::cli::Command;
use crate::commands::team::{create_team_on, join_team};
use crate::prompt::{Choice, TextOptions, choose, frame, info, parses, text};
use crate::token_service::{HOSTED_TOKEN_SERVICE_URL, parse_invite, service_url};

pub fn command() -> Command {
    Command::new("setup")
        .description("Connect this CLI to a token service so your whole team shares one Guesty token")
        .option("--hosted", "Create a team on StayKit's hosted token service")
        .option("--server <url>", "Create a team on your own token service")
        .option("--join <invite>", "Join a team with an invite code or link")
        .action(|c| {
            frame("Team setup", || {
                if let Some(invite) = c.opts.str("join").filter(|v| !v.is_empty()) {
                    return join_team(invite);
                }
                if let Some(server) = c.opts.str("server").filter(|v| !v.is_empty()) {
                    return create_team_on(server);
                }
                if c.opts.flag("hosted") {
                    return create_team_on(HOSTED_TOKEN_SERVICE_URL);
                }

                info("Guesty allows five new tokens a day. Your team shares one through a token service, so nobody uses up the rest.");
                let choice = choose(
                    "How do you want to connect?",
                    &[
                        Choice::new("hosted", "Create a team on StayKit's hosted token service", Some("free")),
                        Choice::new("server", "Create a team on a token service you run yourself", None),
                        Choice::new("join", "Join a team with an invite code or link", None),
                    ],
                )?;
                if choice == "hosted" {
                    return create_team_on(HOSTED_TOKEN_SERVICE_URL);
                }
                if choice == "server" {
                    let url = text(
                        "Token service URL",
                        TextOptions {
                            placeholder: Some("https://".into()),
                            check: Some(parses(service_url)),
                            ..Default::default()
                        },
                    )?;
                    return create_team_on(&url);
                }
                let invite = text(
                    "Invite code or link",
                    TextOptions {
                        placeholder: Some("ABCD-EFGH-JKLM".into()),
                        check: Some(parses(parse_invite)),
                        ..Default::default()
                    },
                )?;
                join_team(&invite)
            })
        })
}

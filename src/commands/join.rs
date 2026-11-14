//! Port of src/commands/join.ts.

use crate::cli::Command;
use crate::commands::team::join_team;
use crate::prompt::frame;

pub fn command() -> Command {
    Command::new("join")
        .description("Join your team with the invite code or link its admin sent you")
        .argument("<invite>", "Invite code, such as ABCD-EFGH-JKLM, or invite link")
        .action(|c| frame("Join a team", || join_team(c.arg(0))))
}

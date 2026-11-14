use crate::auth::{TokenType, get_cached_token};
use crate::cli::Command;
use crate::output::{Data, print};

pub fn command() -> Command {
    Command::new("token")
        .description("Print a valid cached Guesty Open API token. Use --beapi for booking-engine scope. Fails if the correct cached token is unavailable; never requests OAuth tokens.")
        .option("--beapi", "Print the cached BEAPI (booking-engine scope) token instead of Open API")
        .option("--json", "Print token metadata (token_type, access_token, expires_at) as JSON")
        .action(|c| {
            let token = get_cached_token(if c.opts.flag("beapi") { TokenType::Beapi } else { TokenType::OpenApi })?;
            if c.opts.flag("json") {
                print(&Data::Json(token.to_json()));
            } else {
                print(&Data::Text(token.access_token));
            }
            Ok(())
        })
}

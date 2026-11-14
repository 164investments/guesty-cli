//! Port of src/commands/properties.ts.

use crate::cli::{Call, Command};
use crate::client::{Body, Fetch, Params, Part, guesty_fetch};
use crate::commands::query_options::{integer, integer_in, js_trim};
use crate::error::{CliError, Result};
use crate::json::Json;
use crate::output::print;
use crate::stdin;

/// `opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin())` as a
/// request body: `guestyFetch` sends a parsed JSON string as plain text.
pub(super) fn data_body(c: &Call) -> Result<Body> {
    Ok(match stdin::data_or_stdin(c.opts.str("data"))? {
        Json::String(s) => Body::Text(s),
        other => Body::Json(other),
    })
}

fn show(path: &str, fetch: Fetch) -> Result<()> {
    print(&guesty_fetch(path, fetch)?);
    Ok(())
}

/// A command that GETs `path` and prints the response.
fn read(spec: &str, description: &str, path: fn(&Call) -> String) -> Command {
    Command::new(spec).description(description).action(move |c| show(&path(c), Fetch::default()))
}

/// A command that DELETEs `path` and prints the response.
fn delete(spec: &str, description: &str, path: fn(&Call) -> String) -> Command {
    Command::new(spec).description(description).action(move |c| show(&path(c), Fetch::method("DELETE")))
}

/// A command that sends the `--data` or stdin JSON body to `path`.
fn write(spec: &str, description: &str, method: &'static str, path: fn(&Call) -> String) -> Command {
    Command::new(spec).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = data_body(c)?;
        show(&path(c), Fetch { method: method.into(), body: Some(body), ..Fetch::default() })
    })
}

/// JavaScript `parseInt(value)` (base 10, or 16 with a `0x` prefix).
fn parse_int(value: &str) -> f64 {
    let s = js_trim(value);
    let (sign, s) = match s.as_bytes().first() {
        Some(b'-') => (-1.0, &s[1..]),
        Some(b'+') => (1.0, &s[1..]),
        _ => (1.0, s),
    };
    let (radix, s) = if s.starts_with("0x") || s.starts_with("0X") { (16, &s[2..]) } else { (10, s) };
    let end = s.find(|ch: char| !ch.is_digit(radix)).unwrap_or(s.len());
    let digits = &s[..end];
    if digits.is_empty() {
        return f64::NAN;
    }
    let magnitude = if radix == 10 {
        digits.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        digits.chars().fold(0.0, |n, ch| n * 16.0 + ch.to_digit(16).unwrap_or(0) as f64)
    };
    sign * magnitude
}

/// Node's `path.basename` (POSIX).
fn basename(path: &str) -> &str {
    let trimmed = path.trim_end_matches('/');
    trimmed.rsplit('/').next().unwrap_or("")
}

/// Node's `path.extname` (POSIX).
fn extname(path: &str) -> &str {
    let base = basename(path);
    let Some(dot) = base.rfind('.') else { return "" };
    let before = &base[..dot];
    if before.is_empty() || (before == "." && dot == base.len() - 1) {
        return "";
    }
    &base[dot..]
}

pub fn command() -> Command {
    Command::new("properties")
        .alias("prop")
        .description("Property settings: amenities, photos, spaces, house rules, complexes")
        .command(read("amenities <propertyId>", "Get amenities for a property", |c| {
            format!("/v1/properties-api/amenities/{}", c.arg(0))
        }))
        .command(write("set-amenities <propertyId>", "Set amenities for a property (--data or stdin)", "PUT", |c| {
            format!("/v1/properties-api/amenities/{}", c.arg(0))
        }))
        .command(read("supported-amenities", "List all supported amenities", |_| {
            "/v1/properties-api/amenities/supported".into()
        }))
        .command(read("amenity-groups", "List all available amenity groups", |_| {
            "/v1/properties-api/amenities/groups".into()
        }))
        .command(read("photos <propertyId>", "Get all photos for a property", |c| {
            format!("/v1/properties-api/property-photos/property-photos/{}", c.arg(0))
        }))
        .command(write("add-photos <propertyId>", "Add photos to a property (--data or stdin)", "POST", |c| {
            format!("/v1/properties-api/property-photos/property-photos/{}", c.arg(0))
        }))
        .command(write("order-photos <propertyId>", "Reorder photos on a property (--data or stdin)", "POST", |c| {
            format!("/v1/properties-api/property-photos/property-photos/{}/order", c.arg(0))
        }))
        .command(write(
            "update-photo <propertyId> <photoId>",
            "Replace a photo or update its caption (--data or stdin)",
            "POST",
            |c| format!("/v1/properties-api/property-photos/property-photos/{}/{}", c.arg(0), c.arg(1)),
        ))
        .command(delete("delete-photo <propertyId> <photoId>", "Delete a property photo", |c| {
            format!("/v1/properties-api/property-photos/property-photos/{}/{}", c.arg(0), c.arg(1))
        }))
        .command(read("spaces <unitTypeId>", "Get spaces for a unit type", |c| {
            format!("/v1/properties/spaces/unit-type/{}", c.arg(0))
        }))
        .command(read("complex-spaces <complexId>", "Get spaces for a complex", |c| {
            format!("/v1/properties/spaces/complex/{}", c.arg(0))
        }))
        .command(read("bed-types", "List bed types", |_| "/v1/properties/spaces/bed-types".into()))
        .command(read("room-types", "List room types", |_| "/v1/properties/spaces/room-types".into()))
        .command(write("add-space <unitTypeId>", "Add a space to a unit type (--data or stdin)", "POST", |c| {
            format!("/v1/properties/spaces/unit-type/{}/add", c.arg(0))
        }))
        .command(write("edit-space-details <spaceId>", "Edit space details (--data or stdin)", "PATCH", |c| {
            format!("/v1/properties/spaces/space/{}/details", c.arg(0))
        }))
        .command(write("edit-space-beds <spaceId>", "Edit space beds (--data or stdin)", "POST", |c| {
            format!("/v1/properties/spaces/space/{}/edit", c.arg(0))
        }))
        .command(write("remove-space <spaceId>", "Remove a space from its unit type (--data or stdin)", "POST", |c| {
            format!("/v1/properties/spaces/space/{}/remove", c.arg(0))
        }))
        .command(read("house-rules <unitTypeId>", "Get house rules for a unit type", |c| {
            format!("/v1/properties/house-rules/unit-type/{}", c.arg(0))
        }))
        .command(
            Command::new("list-house-rules")
                .description("List house rules for selected properties")
                .required_option("--property-ids <ids>", "Comma-separated unit type IDs")
                .action(|c| {
                    let ids: Vec<&str> = c.opts.str("propertyIds").unwrap_or("").split(',').map(js_trim).collect();
                    if ids.iter().any(|id| id.is_empty()) {
                        return Err(CliError::new("--property-ids must contain nonempty comma-separated IDs."));
                    }
                    show("/v1/properties/house-rules/", Fetch::get(crate::params! { "propertyIds" => ids.join(",") }))
                }),
        )
        .command(write("set-house-rules <unitTypeId>", "Update house rules (--data or stdin)", "PUT", |c| {
            format!("/v1/properties/house-rules/unit-type/{}", c.arg(0))
        }))
        .command(write(
            "set-house-rules-bulk",
            "Update multiple unit-type house rules (--data or stdin)",
            "POST",
            |_| "/v1/properties/house-rules/".into(),
        ))
        .command(read("address <propertyId>", "Get property address", |c| format!("/v1/address/{}", c.arg(0))))
        .command(read("complexes", "List all complexes", |_| "/v1/properties-api/complexes".into()))
        .command(write("create-complex", "Create a complex (--data or stdin)", "POST", |_| {
            "/v1/properties-api/complexes".into()
        }))
        .command(read("complex <id>", "Get a complex by ID", |c| format!("/v1/properties-api/complexes/{}", c.arg(0))))
        .command(write("update-complex <id>", "Update a complex (--data or stdin)", "PUT", |c| {
            format!("/v1/properties-api/complexes/{}", c.arg(0))
        }))
        .command(delete("delete-complex <id>", "Delete a complex", |c| {
            format!("/v1/properties-api/complexes/{}", c.arg(0))
        }))
        .command(write("assign-complex <id>", "Assign property IDs to a complex (--data or stdin)", "PUT", |c| {
            format!("/v1/properties-api/complexes/{}/assign", c.arg(0))
        }))
        .command(write("unassign-complex <id>", "Unassign property IDs from a complex (--data or stdin)", "PUT", |c| {
            format!("/v1/properties-api/complexes/{}/unassign", c.arg(0))
        }))
        .command(
            Command::new("logs <propertyId>")
                .description("Get property logs")
                .option("--from <date>", "From date (ISO 8601)")
                .option("--to <date>", "To date (ISO 8601)")
                .option("--user <userId>", "Filter by user ID")
                .option("--fields <fields>", "Comma-separated fields")
                .option("--limit <n>", "Max results")
                .option("--skip <n>", "Offset")
                .action(|c| {
                    let o = &c.opts;
                    let given = |key: &str| o.str(key).filter(|v| !v.is_empty());
                    let mut params = Params::new();
                    for key in ["from", "to", "user", "fields"] {
                        if let Some(v) = given(key) {
                            params.set(key, v);
                        }
                    }
                    for key in ["limit", "skip"] {
                        if let Some(v) = given(key) {
                            params.set(key, parse_int(v));
                        }
                    }
                    show(&format!("/v1/property-logs/{}", c.arg(0)), Fetch::get(params))
                }),
        )
        .command(read("custom-fields <propertyId>", "Get custom fields for a property", |c| {
            format!("/v1/properties-api/custom-fields/{}", c.arg(0))
        }))
        .command(write(
            "set-custom-fields <propertyId>",
            "Update property custom fields (--data or stdin)",
            "PUT",
            |c| format!("/v1/properties-api/custom-fields/{}", c.arg(0)),
        ))
        .command(read("custom-field <propertyId> <fieldId>", "Get a single property custom field", |c| {
            format!("/v1/properties-api/custom-fields/{}/{}", c.arg(0), c.arg(1))
        }))
        .command(delete("delete-custom-field <propertyId> <fieldId>", "Delete a property custom field", |c| {
            format!("/v1/properties-api/custom-fields/{}/{}", c.arg(0), c.arg(1))
        }))
        .command(read("room-photos <propertyId>", "List room photos for a property", |c| {
            format!("/v1/properties-api/room-photos/property/{}", c.arg(0))
        }))
        .command(read("room-photo <photoId>", "Get a room photo by ID", |c| {
            format!("/v1/properties-api/room-photos/photos/{}", c.arg(0))
        }))
        .command(write("assign-room-photo <photoId>", "Assign a room photo to a space (--data or stdin)", "PUT", |c| {
            format!("/v1/properties-api/room-photos/photos/{}/assign", c.arg(0))
        }))
        .command(write(
            "unassign-room-photo <photoId>",
            "Unassign a room photo from a space (--data or stdin)",
            "PUT",
            |c| format!("/v1/properties-api/room-photos/photos/{}/unassign", c.arg(0)),
        ))
        .command(write("create-group", "Create a property group (--data or stdin)", "POST", |_| {
            "/v1/properties-api/groups/group".into()
        }))
        .command(
            Command::new("list-groups")
                .description("List property groups")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Pagination offset", "0")
                .option("--type <type>", "Filter by COMBO or DUPLICATES")
                .action(|c| {
                    let o = &c.opts;
                    let kind = o.str("type").filter(|t| !t.is_empty());
                    if kind.is_some_and(|t| !["COMBO", "DUPLICATES"].contains(&t)) {
                        return Err(CliError::new("--type must be COMBO or DUPLICATES."));
                    }
                    let mut params = crate::params! {
                        "limit" => integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 200.0)?,
                        "offset" => integer(o.str("skip").unwrap_or(""), "--skip")?,
                    };
                    if let Some(t) = kind {
                        params.set("type", t);
                    }
                    show("/v1/properties-api/groups/group", Fetch::get(params))
                }),
        )
        .command(read("get-group <id>", "Get a property group by ID", |c| {
            format!("/v1/properties-api/groups/group/{}", c.arg(0))
        }))
        .command(delete("delete-group <id>", "Delete a property group", |c| {
            format!("/v1/properties-api/groups/group/{}", c.arg(0))
        }))
        .command(write("update-group <id>", "Update a property group (--data or stdin)", "PATCH", |c| {
            format!("/v1/properties-api/groups/group/{}", c.arg(0))
        }))
        .command(read("list-external-links <propertyId>", "List external links for a property", |c| {
            format!("/v1/properties-api/listing-settings/external-links/{}", c.arg(0))
        }))
        .command(write(
            "create-external-link <propertyId>",
            "Create an external link for a property (--data or stdin)",
            "POST",
            |c| format!("/v1/properties-api/listing-settings/external-links/{}", c.arg(0)),
        ))
        .command(write(
            "reorder-external-links <propertyId>",
            "Reorder external links for a property (--data or stdin)",
            "PUT",
            |c| format!("/v1/properties-api/listing-settings/external-links/{}/order", c.arg(0)),
        ))
        .command(write(
            "update-external-link <propertyId> <linkId>",
            "Update an external link (--data or stdin)",
            "PUT",
            |c| format!("/v1/properties-api/listing-settings/external-links/{}/{}", c.arg(0), c.arg(1)),
        ))
        .command(delete("delete-external-link <propertyId> <linkId>", "Delete an external link", |c| {
            format!("/v1/properties-api/listing-settings/external-links/{}/{}", c.arg(0), c.arg(1))
        }))
        .command(read("get-virtual-tour <propertyId>", "Get virtual tour for a property", |c| {
            format!("/v1/properties-api/property-media/virtual-tour/{}", c.arg(0))
        }))
        .command(write(
            "create-virtual-tour <propertyId>",
            "Create a virtual tour for a property (--data or stdin)",
            "POST",
            |c| format!("/v1/properties-api/property-media/virtual-tour/{}", c.arg(0)),
        ))
        .command(write(
            "update-virtual-tour <propertyId>",
            "Update a virtual tour for a property (--data or stdin)",
            "PUT",
            |c| format!("/v1/properties-api/property-media/virtual-tour/{}", c.arg(0)),
        ))
        .command(delete("delete-virtual-tour <propertyId>", "Delete a virtual tour for a property", |c| {
            format!("/v1/properties-api/property-media/virtual-tour/{}", c.arg(0))
        }))
        .command(
            Command::new("upload-photo <propertyId>")
                .description("Upload a photo file to a property using multipart form data")
                .required_option("--data-file <path>", "Path to the image file to upload")
                .option("--caption <text>", "Photo caption")
                .action(|c| {
                    let file = c.opts.str("dataFile").unwrap_or("");
                    let content_type = match extname(file).to_lowercase().as_str() {
                        ".jpg" | ".jpeg" => "image/jpeg",
                        ".png" => "image/png",
                        ".gif" => "image/gif",
                        ".webp" => "image/webp",
                        _ => "application/octet-stream",
                    };
                    let data =
                        std::fs::read(file).map_err(|e| CliError::new(super::raw::node_fs_error(&e, "open", file)))?;
                    let mut parts = vec![Part::File {
                        name: "file".into(),
                        filename: basename(file).into(),
                        content_type: content_type.into(),
                        data,
                    }];
                    if let Some(caption) = c.opts.str("caption") {
                        parts.push(Part::Text { name: "caption".into(), value: caption.into() });
                    }
                    show(
                        &format!("/v1/properties-api/property-photos/property-photos/{}/upload/blob", c.arg(0)),
                        Fetch { method: "POST".into(), body: Some(Body::Multipart(parts)), ..Fetch::default() },
                    )
                }),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_int_matches_javascript() {
        assert_eq!(parse_int("10bad"), 10.0);
        assert_eq!(parse_int(" -7"), -7.0);
        assert_eq!(parse_int("0x1A"), 26.0);
        assert!(parse_int("abc").is_nan());
        assert!(parse_int("0x").is_nan());
    }

    #[test]
    fn path_helpers_match_node() {
        assert_eq!(extname("/a/b.JPG"), ".JPG");
        assert_eq!(extname(".jpg"), "");
        assert_eq!(extname(".."), "");
        assert_eq!(extname("a."), ".");
        assert_eq!(extname("..jpg"), ".jpg");
        assert_eq!(extname("dir.d/file"), "");
        assert_eq!(basename("/tmp/x/photo.png"), "photo.png");
        assert_eq!(basename("photo.png/"), "photo.png");
    }
}

//! Option value checks shared by commands (`query-options.ts`).

use crate::cli::Value;
use crate::error::{CliError, Result};
use crate::json::{self, Json};

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// `integer(value, option, minimum = 0, maximum = MAX_SAFE_INTEGER)`.
pub fn integer(value: &str, option: &str) -> Result<f64> {
    integer_in(value, option, 0.0, MAX_SAFE_INTEGER)
}

pub fn integer_in(value: &str, option: &str, minimum: f64, maximum: f64) -> Result<f64> {
    let parsed = if !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit()) {
        value.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        f64::NAN
    };
    if !(parsed.is_finite() && parsed.fract() == 0.0 && parsed.abs() <= MAX_SAFE_INTEGER) || parsed < minimum || parsed > maximum {
        return Err(CliError::new(format!(
            "{option} must be an integer between {} and {}.",
            json::number_to_string(minimum, false),
            json::number_to_string(maximum, false)
        )));
    }
    Ok(parsed)
}

/// An integer option given as a number (commander defaults are strings, but
/// some callers pass numbers).
pub fn integer_number(value: f64, option: &str, minimum: f64, maximum: f64) -> Result<f64> {
    if !(value.is_finite() && value.fract() == 0.0 && value.abs() <= MAX_SAFE_INTEGER) || value < minimum || value > maximum {
        return Err(CliError::new(format!(
            "{option} must be an integer between {} and {}.",
            json::number_to_string(minimum, false),
            json::number_to_string(maximum, false)
        )));
    }
    Ok(value)
}

fn days_in_month(year: i64, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m as i64 + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

fn digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

/// `Date.parse` for `YYYY-MM-DD` (UTC midnight), or None if invalid.
pub fn parse_date(value: &str) -> Option<f64> {
    let b = value.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' || !digits(&value[..4]) || !digits(&value[5..7]) || !digits(&value[8..]) {
        return None;
    }
    let (y, m, d): (i64, u32, u32) = (value[..4].parse().ok()?, value[5..7].parse().ok()?, value[8..].parse().ok()?);
    if !(1..=12).contains(&m) || d < 1 || d > days_in_month(y, m) {
        return None;
    }
    Some(days_from_civil(y, m, d) as f64 * 86_400_000.0)
}

/// `Date.parse` for `YYYY-MM-DDTHH:mm:ss[.fff](Z|±HH:mm)`, as V8 reads it.
pub fn parse_date_time(value: &str) -> Option<f64> {
    if value.len() < 20 || value.as_bytes()[10] != b'T' {
        return None;
    }
    let day = parse_date(&value[..10])?;
    let rest = &value[11..];
    let b = rest.as_bytes();
    if b.len() < 9 || b[2] != b':' || b[5] != b':' || !digits(&rest[..2]) || !digits(&rest[3..5]) || !digits(&rest[6..8]) {
        return None;
    }
    let (h, mi, s): (u32, u32, u32) = (rest[..2].parse().ok()?, rest[3..5].parse().ok()?, rest[6..8].parse().ok()?);
    let mut tail = &rest[8..];
    let mut millis = 0.0;
    if let Some(frac) = tail.strip_prefix('.') {
        let end = frac.find(|c: char| !c.is_ascii_digit()).unwrap_or(frac.len());
        if end == 0 {
            return None;
        }
        let ms = format!("{:0<3}", &frac[..end.min(3)]);
        millis = ms.parse::<f64>().ok()?;
        tail = &frac[end..];
    }
    let offset_min: i64 = if tail == "Z" {
        0
    } else {
        let tb = tail.as_bytes();
        if tb.len() != 6 || !(tb[0] == b'+' || tb[0] == b'-') || tb[3] != b':' || !digits(&tail[1..3]) || !digits(&tail[4..]) {
            return None;
        }
        let (oh, om): (i64, i64) = (tail[1..3].parse().ok()?, tail[4..].parse().ok()?);
        if oh > 23 || om > 59 {
            return None;
        }
        let sign = if tb[0] == b'-' { -1 } else { 1 };
        sign * (oh * 60 + om)
    };
    if mi > 59 || s > 59 || h > 24 || (h == 24 && (mi != 0 || s != 0 || millis != 0.0)) {
        return None;
    }
    Some(day + ((h * 3600 + mi * 60 + s) as f64) * 1000.0 + millis - (offset_min * 60_000) as f64)
}

/// `date(value, option)`.
pub fn date(value: &str, option: &str) -> Result<String> {
    if parse_date(value).is_none() {
        return Err(CliError::new(format!("{option} must be a valid date in YYYY-MM-DD format.")));
    }
    Ok(value.to_string())
}

/// `dateTime(value, option)`.
pub fn date_time(value: &str, option: &str) -> Result<String> {
    let prefix: String = value.chars().take(10).collect();
    date(&prefix, option)?;
    if parse_date_time(value).is_none() {
        return Err(CliError::new(format!("{option} must be an ISO 8601 date-time including a timezone.")));
    }
    Ok(value.to_string())
}

/// `Date.parse(value)` for a value `dateRange` accepted.
fn parse_any(value: &str) -> f64 {
    if value.contains('T') { parse_date_time(value) } else { parse_date(value) }.unwrap_or(f64::NAN)
}

/// `dateRange(from, to, fromOption = "--from", toOption = "--to")`.
pub fn date_range(from: Option<&str>, to: Option<&str>) -> Result<()> {
    date_range_named(from, to, "--from", "--to")
}

pub fn date_range_named(from: Option<&str>, to: Option<&str>, from_option: &str, to_option: &str) -> Result<()> {
    for (value, option) in [(from, from_option), (to, to_option)] {
        if let Some(v) = value {
            if v.contains('T') {
                date_time(v, option)?;
            } else {
                date(v, option)?;
            }
        }
    }
    if let (Some(f), Some(t)) = (from, to) {
        if parse_any(f) > parse_any(t) {
            return Err(CliError::new(format!("{from_option} must be on or before {to_option}.")));
        }
    }
    Ok(())
}

/// `jsonObject(value, option)`.
pub fn json_object(value: &str, option: &str) -> Result<json::Map<String, Json>> {
    match json::parse(value) {
        Ok(Json::Object(map)) => Ok(map),
        _ => Err(CliError::new(format!("{option} must be a JSON object."))),
    }
}

/// `jsonArray(value, option)`.
pub fn json_array(value: &str, option: &str) -> Result<Vec<Json>> {
    match json::parse(value) {
        Ok(Json::Array(items)) => Ok(items),
        Ok(_) => Err(CliError::new(format!("{option} must be a JSON array."))),
        Err(()) => Err(CliError::new(format!("{option} must be a JSON array."))),
    }
}

/// `collect(value, previous)` for repeatable options.
pub fn collect(value: &str, previous: Option<&Value>) -> Result<Value> {
    if value.trim().is_empty() {
        return Err(CliError::new("Repeated option values must not be empty."));
    }
    let mut items = match previous {
        Some(Value::List(items)) => items.clone(),
        _ => Vec::new(),
    };
    items.push(value.to_string());
    Ok(Value::List(items))
}

/// The `[]` default of a collected option.
pub fn empty_list() -> Option<Value> {
    Some(Value::List(Vec::new()))
}

/// `fields(value)`: comma- or space-separated field names, space-joined.
pub fn fields(value: &str) -> Result<String> {
    let normalized = value
        .split(|c: char| c == ',' || c.is_whitespace() || c == '\u{feff}')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    if normalized.is_empty() {
        return Err(CliError::new("Field selection must not be empty."));
    }
    Ok(normalized)
}

/// `decimal(value, option, minimum, maximum)`.
pub fn decimal(value: &str, option: &str, minimum: f64, maximum: f64) -> Result<f64> {
    let body = value.strip_prefix('-').unwrap_or(value);
    let shaped = match body.split_once('.') {
        Some((int, frac)) => digits(int) && digits(frac),
        None => digits(body),
    };
    let parsed = if shaped { value.parse::<f64>().unwrap_or(f64::NAN) } else { f64::NAN };
    if !parsed.is_finite() || parsed < minimum || parsed > maximum {
        let mut range = Vec::new();
        if minimum.is_finite() {
            range.push(format!("at least {}", json::number_to_string(minimum, false)));
        }
        if maximum.is_finite() {
            range.push(format!("at most {}", json::number_to_string(maximum, false)));
        }
        let range = range.join(" and ");
        return Err(CliError::new(format!(
            "{option} must be a number{}.",
            if range.is_empty() { String::new() } else { format!(" {range}") }
        )));
    }
    Ok(parsed)
}

/// `list(value, option)`: a comma-separated list of nonempty values.
pub fn list(value: &str, option: &str) -> Result<Vec<String>> {
    let values: Vec<String> = value.split(',').map(|s| js_trim(s).to_string()).collect();
    if values.is_empty() || values.iter().any(String::is_empty) {
        return Err(CliError::new(format!("{option} must be a comma-separated list of nonempty values.")));
    }
    Ok(values)
}

/// `String#trim()`: JavaScript's whitespace includes U+FEFF.
pub fn js_trim(value: &str) -> &str {
    value.trim_matches(|c: char| c.is_whitespace() || c == '\u{feff}')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates() {
        assert!(date("2026-02-28", "--from").is_ok());
        assert!(date("2026-02-30", "--from").is_err());
        assert!(date("2024-02-29", "--from").is_ok());
        assert!(date_time("2026-01-01T00:00:00Z", "--x").is_ok());
        assert!(date_time("2026-01-01T00:00:00.123+05:30", "--x").is_ok());
        assert!(date_time("2026-01-01T00:00:00", "--x").is_err());
        assert!(date_range(Some("2026-02-01"), Some("2026-01-01")).is_err());
        assert!(date_range(Some("2026-01-01T10:00:00+02:00"), Some("2026-01-01T09:00:00Z")).is_ok());
        assert_eq!(parse_date("1970-01-02"), Some(86_400_000.0));
    }

    #[test]
    fn integers() {
        assert_eq!(integer_in("25", "--limit", 1.0, 100.0).unwrap(), 25.0);
        assert_eq!(
            integer_in("2oops", "--limit", 1.0, 100.0).unwrap_err().message(),
            "--limit must be an integer between 1 and 100."
        );
        assert_eq!(integer("-1", "--skip").unwrap_err().message(), "--skip must be an integer between 0 and 9007199254740991.");
    }
}

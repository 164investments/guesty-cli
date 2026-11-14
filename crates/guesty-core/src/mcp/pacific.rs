//! The Pacific-time date format the MCP server prints, as Node's ICU does.

use chrono::{Datelike, Offset, Timelike};

use crate::json::Json;

/// Seconds from UTC in Los Angeles. The tz database lists transitions only
/// to 2037; ICU, like JavaScript, keeps applying today's rule after that:
/// daylight time from 2 AM on March's second Sunday to 2 AM on November's first.
fn pacific_offset(utc: chrono::DateTime<chrono::Utc>) -> i32 {
    let year = utc.year();
    if year < 2008 {
        return utc.with_timezone(&chrono_tz::America::Los_Angeles).offset().fix().local_minus_utc();
    }
    let sunday = |month: u32, nth: u32, hour_utc: u32| {
        let first = chrono::NaiveDate::from_ymd_opt(year, month, 1).expect("date");
        let to_sunday = (7 - first.weekday().num_days_from_sunday()) % 7;
        let day = first + chrono::Duration::days(i64::from(to_sunday + 7 * (nth - 1)));
        day.and_hms_opt(hour_utc, 0, 0).expect("time").and_utc()
    };
    // 2 AM PST is 10:00 UTC; 2 AM PDT is 09:00 UTC.
    if sunday(3, 2, 10) <= utc && utc < sunday(11, 1, 9) { -7 * 3600 } else { -8 * 3600 }
}

/// `new Date(value).toLocaleString("en-US", { timeZone: "America/Los_Angeles",
/// weekday: "short", month: "short", day: "numeric", hour: "numeric",
/// minute: "2-digit", timeZoneName: "short" })`, as Node's ICU prints it.
pub fn pacific(value: Option<&Json>) -> String {
    const INVALID: &str = "Invalid Date";
    let ms = match value {
        Some(Json::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Json::Null) => 0.0,
        Some(Json::Bool(b)) => f64::from(u8::from(*b)),
        // Strings are parsed as dates in JavaScript; the token service sends numbers.
        _ => f64::NAN,
    };
    if !ms.is_finite() || ms.abs() > 8.64e15 {
        return INVALID.into();
    }
    let ms = ms.trunc() as i64;
    let Some(utc) = chrono::DateTime::from_timestamp_millis(ms) else { return INVALID.into() };
    let offset = pacific_offset(utc);
    let local = utc.naive_utc() + chrono::Duration::seconds(i64::from(offset));
    // ICU names the zone PST/PDT only within its metazone's range (from 1970
    // to the end of year 9999); elsewhere it prints the offset.
    let name = if (0..253_402_300_740_000).contains(&ms) {
        if offset == -7 * 3600 { "PDT".to_string() } else { "PST".to_string() }
    } else {
        let sign = if offset < 0 { '-' } else { '+' };
        let abs = offset.abs();
        let (h, m, s) = (abs / 3600, abs / 60 % 60, abs % 60);
        match (m, s) {
            (0, 0) => format!("GMT{sign}{h}"),
            (_, 0) => format!("GMT{sign}{h}:{m:02}"),
            _ => format!("GMT{sign}{h}:{m:02}:{s:02}"),
        }
    };
    const DAYS: [&str; 7] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const MONTHS: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let hour = local.hour();
    let (h12, half) = (if hour % 12 == 0 { 12 } else { hour % 12 }, if hour < 12 { "AM" } else { "PM" });
    format!(
        "{}, {} {}, {}:{:02} {} {}",
        DAYS[local.weekday().num_days_from_monday() as usize],
        MONTHS[local.month0() as usize],
        local.day(),
        h12,
        local.minute(),
        half,
        name
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::json;

    #[test]
    fn dates_print_like_node() {
        let at = |ms: f64| pacific(Some(&json!(ms)));
        assert_eq!(at(1_800_604_800_000.0), "Fri, Jan 22, 12:00 AM PST");
        assert_eq!(at(1_784_000_000_000.0), "Mon, Jul 13, 8:33 PM PDT");
        assert_eq!(at(0.0), "Wed, Dec 31, 4:00 PM PST");
        assert_eq!(at(-1.0), "Wed, Dec 31, 3:59 PM GMT-8");
        assert_eq!(at(1e15), "Thu, Sep 26, 6:46 PM GMT-7");
        assert_eq!(at(-2_717_640_000_001.0), "Sun, Nov 18, 12:07 PM GMT-7:52:58");
        assert_eq!(at(8.64e15 + 1.0), "Invalid Date");
        assert_eq!(pacific(None), "Invalid Date");
        assert_eq!(pacific(Some(&Json::Null)), "Wed, Dec 31, 4:00 PM PST");
        // Around the 2026 changes, and after the tz database's last listed year.
        assert_eq!(at(1_772_963_940_000.0), "Sun, Mar 8, 1:59 AM PST");
        assert_eq!(at(1_772_964_000_000.0), "Sun, Mar 8, 3:00 AM PDT");
        assert_eq!(at(1_793_523_540_000.0), "Sun, Nov 1, 1:59 AM PDT");
        assert_eq!(at(1_793_523_600_000.0), "Sun, Nov 1, 1:00 AM PST");
        assert_eq!(at(2_540_246_400_000.0), "Thu, Jun 30, 5:00 PM PDT");
    }
}

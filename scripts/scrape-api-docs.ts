#!/usr/bin/env npx tsx
/**
 * Scrapes all Guesty API reference pages as markdown.
 * Each page at open-api-docs.guesty.com/reference/{slug}
 * has a .md variant that returns raw markdown.
 *
 * Usage: npx tsx scripts/scrape-api-docs.ts
 */

import { writeFile, mkdir, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://open-api-docs.guesty.com/reference";
const OUTPUT_DIR = join(__dirname, "..", "docs", "api-reference");
const CONCURRENCY = 5;
const DELAY_MS = 200; // be respectful of rate limits

// All slugs scraped from the sidebar
const SLUGS = [
  "account-brands",
  "accounting-only-available-for-accounting-add-on-users",
  "accounts",
  "addcomplex",
  "additionalfees",
  "address",
  "addresscontroller_geocodeaddress",
  "addresscontroller_getaddress",
  "addresscontroller_updateaddress",
  "addresscontroller_updatecomplexaddress",
  "airbnb-listing-expectations",
  "airbnb-resolution-center",
  "airbnbresolutionscontroller_listresolutions",
  "amenities",
  "amenitiescontroller_getforunittype",
  "amenitiescontroller_setamenitiesforproperty",
  "aricalendarcontroller_get",
  "aricalendarcontroller_upsert",
  "assignlistingcontroller_update",
  "authentication-2",
  "businessmodelsoacontroller_index",
  "calendar",
  "calendar-logs",
  "calendar-sync-ical-export",
  "calendar-sync-ical-import",
  "calendarlogsopenapicontroller_getcalendarlogs",
  "categoriescontroller_getcategories",
  "channel-commission",
  "channelcommissioncontroller_getaccountchannelcommission",
  "channelcommissioncontroller_getaccountchannelcommission1",
  "channelcommissioncontroller_getlistingschannelcommission",
  "channelcommissioncontroller_updateaccountchannelcommission",
  "channelcommissioncontroller_updatelistingchannelcommission",
  "complexescontroller_getcomplex",
  "complexescontroller_listcomplexes",
  "contactcustomfieldcontroller_createcustomfield",
  "contactcustomfieldcontroller_deletecustomfield",
  "contactcustomfieldcontroller_getcustomfield",
  "contactcustomfieldcontroller_getcustomfields",
  "contactcustomfieldcontroller_updatecustomfield",
  "contacts",
  "contactscontroller_createcontact",
  "contactscontroller_deletecontact",
  "contactscontroller_getcontact",
  "contactscontroller_listcontacts",
  "contactscontroller_updatecontact",
  "content-configuration",
  "create-reservation-custom-field",
  "create-reservation-custom-fields",
  "crmcustomfieldcontroller_createcustomfield",
  "crmcustomfieldcontroller_deletecustomfield",
  "crmcustomfieldcontroller_getcustomfield",
  "crmcustomfieldcontroller_getcustomfields",
  "crmcustomfieldcontroller_updatecustomfield",
  "custom-fields",
  "custom-fields-1",
  "custom-fields-accounts",
  "customcalendareventscontroller_createcustomevent",
  "customcalendareventscontroller_deletecustomevent",
  "customcalendareventscontroller_getcustomevents",
  "customcalendareventscontroller_updatecustomevent",
  "customcontentconfigurationcontroller_createorconfigconfiguration",
  "customcontentconfigurationcontroller_getcontentconfiguration",
  "customwebsitecontroller_getcustomwebsitebylistingid",
  "customwebsitecontroller_updatecustomwebsitebylistingid",
  "delete_listings-id-custom-fields-field-id",
  "delete_reservations-reservation-id-custom-fields-field-id",
  "direct-booking-website",
  "distributioncalendarcontroller_getdistributioncalendardaybyid",
  "distributioncalendarcontroller_updatedistributioncalendardays",
  "distribution-calendar",
  "end-of-life-deprecated",
  "export-as-csv",
  "financialreportscontroller_listingreport",
  "financialreportscontroller_ownersreport",
  "gendatacontroller_generatechatdata",
  "get_listings-id-custom-fields",
  "get_listings-id-custom-fields-field-id",
  "get_reservations-id",
  "get_reservations-id-custom-fields",
  "get_reservations-id-custom-fields-field-id",
  "get_reservations",
  "groups",
  "guest-communication",
  "guest-communication-api",
  "guestcommunicationcontroller_assignchattouser",
  "guestcommunicationcontroller_getconversation",
  "guestcommunicationcontroller_listconversations",
  "guestcommunicationcontroller_markasread",
  "guestcommunicationcontroller_markasunread",
  "guestcommunicationcontroller_postcannedresponse",
  "guestcommunicationcontroller_postchatcustomizedmessage",
  "guestcommunicationcontroller_postchatmessage",
  "guestcommunicationcontroller_searchcannedresponses",
  "guestcommunicationcontroller_sendairbnbspecialofferorequest",
  "guests",
  "guestscontroller_getguest",
  "guestscontroller_getguestslist",
  "guestscontroller_updateguest",
  "hooks",
  "hookscontroller_activatewebhook",
  "hookscontroller_createwebhook",
  "hookscontroller_deactivatewebhook",
  "hookscontroller_deletewebhook",
  "hookscontroller_getwebhook",
  "hookscontroller_getwebhooks",
  "hookscontroller_updatewebhook",
  "house-rules",
  "how-to-use-the-api-reference",
  "integration-listings",
  "integrationlistingscontroller_getintegrationlisting",
  "integrationlistingscontroller_listintegrationlistings",
  "integrationlistingscontroller_updateintegrationlisting",
  "inventory-management",
  "invoiceitemscontroller_createinvoiceitem",
  "invoiceitemscontroller_deleteinvoiceitem",
  "invoiceitemscontroller_getinvoiceitembyresnandid",
  "invoiceitemscontroller_getinvoiceitemsbyresn",
  "invoiceitemscontroller_updateinvoiceitem",
  "invoice-items",
  "keyscontroller_createkey",
  "keyscontroller_deletekey",
  "keyscontroller_getkeys",
  "lead-management",
  "leads-only-available-for-lead-management-users",
  "leadscontroller_createlead",
  "leadscontroller_getleadbyid",
  "leadscontroller_getleads",
  "leadscontroller_updatelead",
  "listing-custom-events",
  "listing-expectations",
  "listingexpectationscontroller_getairbnblistingexpectation",
  "listingexpectationscontroller_getairbnblistingexpectationbylistingid",
  "listingexpectationscontroller_setairbnblistingexpectationbylistingid",
  "listings",
  "listings-api",
  "listingscontroller_getlisting",
  "listingscontroller_getlistings",
  "listingscontroller_updatelisting",
  "marketplace-connections",
  "marketplaceconnectionscontroller_listaccountmarketplaceconnections",
  "misc-listing-data",
  "notes",
  "notescontroller_createlistingnote",
  "notescontroller_createnote",
  "notescontroller_createresnote",
  "notescontroller_deletelistingnote",
  "notescontroller_deletenote",
  "notescontroller_deleteresnote",
  "notescontroller_getlistingnotes",
  "notescontroller_getnotes",
  "notescontroller_getresnotes",
  "notescontroller_updatelistingnote",
  "notescontroller_updatenote",
  "notescontroller_updateresnote",
  "open-api-faq",
  "owner-management",
  "owner-management-1",
  "ownermanagementcontroller_getowner",
  "ownermanagementcontroller_getowners",
  "ownermanagementcontroller_updateowner",
  "ownerreservationsopenapicontroller_createownerreservation",
  "ownerreservationsopenapicontroller_deleteownerreservation",
  "ownerreservationsopenapicontroller_getownerreservation",
  "ownerreservationsopenapicontroller_listownerreservations",
  "ownerreservationsopenapicontroller_updateownerreservation",
  "owner-reservations",
  "owners-portal-settings",
  "ownersportalsettingscontroller_getownersettings",
  "ownersportalsettingscontroller_updateownersettings",
  "patch_reservations-id-payments-paymentid-cancel",
  "payment-processing",
  "paymentscontroller_collectpayment",
  "paymentscontroller_refundpayment",
  "paymentscontroller_updatepayment",
  "pictures",
  "picturescontroller_deletepicture",
  "picturescontroller_getpicture",
  "picturescontroller_getpictures",
  "picturescontroller_setpicturecaption",
  "picturescontroller_sortpictures",
  "picturescontroller_uploadpicture",
  "post_listings-id-custom-fields",
  "post_reservations-id-approve",
  "post_reservations-id-decline",
  "post_reservations-id-invoiceitems",
  "post_reservations-id-payments",
  "post_reservations-id-payments-paymentid-refund",
  "post_reservations-id-request-cancellation-sync",
  "post_reservations",
  "price-adjustments",
  "priceadjustmentcontroller_getpriceadjustments",
  "priceadjustmentcontroller_setpriceadjustment",
  "promotions-open-api",
  "promotionsopenapicontroller_createpromotion",
  "promotionsopenapicontroller_deletepromotion",
  "promotionsopenapicontroller_getpromotion",
  "promotionsopenapicontroller_getpromotions",
  "promotionsopenapicontroller_updatepromotion",
  "properties-logs",
  "propertieslogscontroller_getpropertylogs",
  "property-media",
  "propertymediacontroller_createpropertymedia",
  "propertymediacontroller_deletepropertymedia",
  "propertymediacontroller_getallpropertymedia",
  "propertymediacontroller_getpropertymedia",
  "propertymediacontroller_sortpropertymedia",
  "propertymediacontroller_updatepropertymedia",
  "property-photos",
  "propertyphotoscontroller_updatepropertyrelatedphotos",
  "put_listings-id-custom-fields",
  "put_reservations-id",
  "put_reservations-id-custom-fields",
  "put_reservations-id-payments-paymentid",
  "quotes-open-api",
  "quotesopenapicontroller_createquote",
  "quotesopenapicontroller_deletequote",
  "quotesopenapicontroller_getquote",
  "quotesopenapicontroller_getquotes",
  "quotesopenapicontroller_updatequote",
  "rate-strategy-openapi",
  "ratestrategyopenapicontroller_createratestrategy",
  "ratestrategyopenapicontroller_deleteratestrategy",
  "ratestrategyopenapicontroller_getratestrategy",
  "ratestrategyopenapicontroller_listratestrategies",
  "ratestrategyopenapicontroller_updateratestrategy",
  "reservations",
  "reservationscustomfieldscontroller_deletereservationcustomfield",
  "reservationscustomfieldsopenapicontroller_createmultiplefields",
  "reservationscustomfieldsopenapicontroller_createreservationcustomfield",
  "reservationscustomfieldsopenapicontroller_getreservationcustomfield",
  "reservationscustomfieldsopenapicontroller_listreservationcustomfields",
  "reservationscustomfieldsopenapicontroller_updatereservationcustomfield",
  "reservationscontroller_searchreservations",
  "reservationsopenapicontroller_createreservation",
  "reservationsopenapicontroller_deletereservationcustomfield",
  "reservationsopenapicontroller_exportreservationscsv",
  "reservationsopenapicontroller_getreservation",
  "reservationsopenapicontroller_getreservationcustomfield",
  "reservationsopenapicontroller_getreservationcustomfields",
  "reservationsopenapicontroller_updatereservation",
  "reservations-report",
  "reservationsreportsopenapicontroller_createreservationsreportview",
  "reservationsreportsopenapicontroller_deletereservationsreportview",
  "reservationsreportsopenapicontroller_getreportbyviewid",
  "reservationsreportsopenapicontroller_getreservationsreportviews",
  "reservationsreportsopenapicontroller_updatereservationsreportview",
  "revenue-management",
  "review",
  "reviewcontroller_createcustomchannel",
  "reviewcontroller_getreviews",
  "reviewcontroller_getreviewsaveragebylistingids",
  "reviewcontroller_postreply",
  "rooms",
  "roomscontroller_getroom",
  "roomscontroller_getrooms",
  "roomscontroller_updateroom",
  "saved-replies",
  "scheduled-messages",
  "scheduledmessagescontroller_createautomation",
  "scheduledmessagescontroller_deleteautomation",
  "scheduledmessagescontroller_disableautomation",
  "scheduledmessagescontroller_enableautomation",
  "scheduledmessagescontroller_getautomation",
  "scheduledmessagescontroller_listautomations",
  "scheduledmessagescontroller_updateautomation",
  "smart-locks-api",
  "smartlocksopenapicontroller_getsmartlockdevices",
  "smartlocksopenapicontroller_getsmartlockreservationcodes",
  "spaces-1",
  "spacescontroller_getallspaces",
  "spacescontroller_getspace",
  "spacescontroller_updatespace",
  "tags",
  "tagscontroller_addtagstoentity",
  "tagscontroller_createtag",
  "tagscontroller_deletetag",
  "tagscontroller_getaccounttags",
  "tagscontroller_removetagsfromentity",
  "tagscontroller_updatetag",
  "tasks",
  "taskscontroller_createtask",
  "taskscontroller_deletetask",
  "taskscontroller_gettask",
  "taskscontroller_listtasks",
  "taskscontroller_updatetask",
  "taxes",
  "taxescontroller_assigntaxsets",
  "taxescontroller_createtax",
  "taxescontroller_createtaxset",
  "taxescontroller_deletetax",
  "taxescontroller_deletetaxset",
  "taxescontroller_gettaxes",
  "taxescontroller_gettaxset",
  "taxescontroller_gettaxsets",
  "taxescontroller_updatetax",
  "taxescontroller_updatetaxset",
  "terms-of-service",
  "the-guesty-booking-engine",
  "unitcontroller_createunit",
  "unitcontroller_deleteunit",
  "unitcontroller_getunit",
  "unitcontroller_getunits",
  "unitcontroller_updateunit",
  "unittypecontroller_createunittype",
  "unittypecontroller_deleteunittype",
  "unittypecontroller_getunittype",
  "unittypecontroller_getunittypes",
  "unittypecontroller_updateunittype",
  "unit-types",
  "units",
  "userscontroller_getusers",
  "webhooks",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchResult {
  slug: string;
  success: boolean;
  error?: string;
  size?: number;
}

async function fetchMarkdown(slug: string): Promise<{ content: string | null; error?: string }> {
  const url = `${BASE_URL}/${slug}.md`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { content: null, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    return { content: text };
  } catch (e) {
    return { content: null, error: (e as Error).message };
  }
}

function categorizeSlug(slug: string): string {
  // Group by the main resource/section
  // Section header slugs (no underscore, no method prefix) become the category
  // Endpoint slugs like "put_reservations-id" → "reservations"
  // Controller slugs like "hookscontroller_createwebhook" → "hooks"

  const methodPrefixes = ["get_", "put_", "post_", "patch_", "delete_"];
  for (const prefix of methodPrefixes) {
    if (slug.startsWith(prefix)) {
      const rest = slug.slice(prefix.length);
      const base = rest.split("-")[0];
      return base;
    }
  }

  if (slug.includes("controller_")) {
    const base = slug.split("controller_")[0];
    // Remove "openapi", "soa", etc. suffixes
    return base
      .replace(/openapi$/i, "")
      .replace(/soa$/i, "")
      .replace(/customfields$/i, "-custom-fields");
  }

  return slug;
}

async function main() {
  console.log(`Scraping ${SLUGS.length} Guesty API doc pages...\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const results: FetchResult[] = [];
  let completed = 0;

  // Process in batches for concurrency control
  for (let i = 0; i < SLUGS.length; i += CONCURRENCY) {
    const batch = SLUGS.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (slug) => {
      const { content, error } = await fetchMarkdown(slug);
      completed++;

      if (content) {
        const filename = `${slug}.md`;
        const filepath = join(OUTPUT_DIR, filename);
        await writeFile(filepath, content, "utf-8");

        if (completed % 20 === 0 || completed === SLUGS.length) {
          console.log(`  [${completed}/${SLUGS.length}] ...`);
        }

        results.push({ slug, success: true, size: content.length });
      } else {
        console.log(`  FAILED: ${slug} — ${error}`);
        results.push({ slug, success: false, error });
      }
    });

    await Promise.all(promises);
    await sleep(DELAY_MS);
  }

  // Write index
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const indexContent = [
    "# Guesty API Reference — Scraped Docs",
    "",
    `Scraped: ${new Date().toISOString()}`,
    `Total pages: ${SLUGS.length}`,
    `Succeeded: ${succeeded.length}`,
    `Failed: ${failed.length}`,
    "",
    "## Pages",
    "",
    ...succeeded.map(
      (r) =>
        `- [${r.slug}](./${r.slug}.md) (${((r.size ?? 0) / 1024).toFixed(1)} KB)`
    ),
    "",
    ...(failed.length > 0
      ? [
          "## Failed",
          "",
          ...failed.map((r) => `- ${r.slug}: ${r.error}`),
        ]
      : []),
  ].join("\n");

  await writeFile(join(OUTPUT_DIR, "INDEX.md"), indexContent, "utf-8");

  console.log(`\nDone!`);
  console.log(`  Succeeded: ${succeeded.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);

#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { loadEnv } from "./env.js";
loadEnv();

import { Command } from "commander";
import { reservations } from "./commands/reservations.js";
import { listings } from "./commands/listings.js";
import { calendar } from "./commands/calendar.js";
import { guests } from "./commands/guests.js";
import { conversations } from "./commands/conversations.js";
import { tasks } from "./commands/tasks.js";
import { financials } from "./commands/financials.js";
import { reviews } from "./commands/reviews.js";
import { owners } from "./commands/owners.js";
import { accounting } from "./commands/accounting.js";
import { properties } from "./commands/properties.js";
import { quotes } from "./commands/quotes.js";
import { webhooks } from "./commands/webhooks.js";
import { users } from "./commands/users.js";
import { integrations } from "./commands/integrations.js";
import { marketing } from "./commands/marketing.js";
import { raw } from "./commands/raw.js";
import { taxes } from "./commands/taxes.js";
import { paymentProviders } from "./commands/payment-providers.js";
import { channelCommission } from "./commands/channel-commission.js";
import { rateStrategies } from "./commands/rate-strategies.js";
import { init } from "./commands/init.js";
import { contacts } from "./commands/contacts.js";
import { icalendar } from "./commands/icalendar.js";
import { savedReplies } from "./commands/saved-replies.js";
import { ratePlans } from "./commands/rate-plans.js";
import { additionalFees } from "./commands/additional-fees.js";
import { address } from "./commands/address.js";
import { promotions } from "./commands/promotions.js";
import { priceAdjustments } from "./commands/price-adjustments.js";
import { userScope } from "./commands/user-scope.js";
import { guestApp } from "./commands/guest-app.js";
import { guestCode } from "./commands/guest-code.js";
import { blockLogs } from "./commands/block-logs.js";
import { airbnb } from "./commands/airbnb.js";
import { invoiceItems } from "./commands/invoice-items.js";
import { accounts } from "./commands/accounts.js";
import { checkForUpdate, runSelfUpdate } from "./update-check.js";

function getCliVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command()
  .name("guesty")
  .version(getCliVersion())
  .description("Guesty API CLI with OAuth token caching. Named commands cover common workflows, and 'raw' handles the rest of the API surface.");

program.addCommand(init);
program.addCommand(reservations);
program.addCommand(listings);
program.addCommand(calendar);
program.addCommand(guests);
program.addCommand(conversations);
program.addCommand(tasks);
program.addCommand(financials);
program.addCommand(reviews);
program.addCommand(owners);
program.addCommand(accounting);
program.addCommand(properties);
program.addCommand(quotes);
program.addCommand(webhooks);
program.addCommand(users);
program.addCommand(integrations);
program.addCommand(marketing);
program.addCommand(taxes);
program.addCommand(paymentProviders);
program.addCommand(channelCommission);
program.addCommand(rateStrategies);
program.addCommand(contacts);
program.addCommand(icalendar);
program.addCommand(savedReplies);
program.addCommand(ratePlans);
program.addCommand(additionalFees);
program.addCommand(address);
program.addCommand(promotions);
program.addCommand(priceAdjustments);
program.addCommand(userScope);
program.addCommand(guestApp);
program.addCommand(guestCode);
program.addCommand(blockLogs);
program.addCommand(airbnb);
program.addCommand(invoiceItems);
program.addCommand(accounts);
program.addCommand(raw);

program
  .command("update")
  .description("Update guesty-cli to the latest version")
  .action(() => runSelfUpdate());

checkForUpdate().then(() => {
  program.parseAsync().catch((err: Error) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  });
});

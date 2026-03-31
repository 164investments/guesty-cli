#!/usr/bin/env node

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
import { raw } from "./commands/raw.js";
import { init } from "./commands/init.js";

const program = new Command()
  .name("guesty")
  .version("1.0.0")
  .description("Guesty API CLI — authenticates via OAuth with disk-cached tokens. Use 'raw' for any endpoint not covered by named commands.");

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
program.addCommand(raw);

program.parseAsync().catch((err: Error) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});

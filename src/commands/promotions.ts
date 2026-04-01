import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const promotions = new Command("promotions")
  .alias("promo")
  .description("Manage promotion property assignments");

promotions
  .command("assign-properties <promotionId>")
  .description("Assign properties to a promotion (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (promotionId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-promotions/promotions/${promotionId}/assign`, {
      method: "PUT",
      body,
    });
    print(data);
  });

promotions
  .command("unassign-properties <promotionId>")
  .description("Unassign properties from a promotion (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (promotionId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-promotions/promotions/${promotionId}/unassign`, {
      method: "PUT",
      body,
    });
    print(data);
  });

promotions
  .command("list-properties <promotionId>")
  .description("List properties assigned to a promotion")
  .action(async (promotionId: string) => {
    const data = await guestyFetch(`/v1/rm-promotions/promotions/${promotionId}/listings`);
    print(data);
  });

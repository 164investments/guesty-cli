import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const properties = new Command("properties")
  .alias("prop")
  .description("Property settings: amenities, photos, spaces, house rules, complexes");

properties
  .command("amenities <propertyId>")
  .description("Get amenities for a property")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/amenities/${id}`);
    print(data);
  });

properties
  .command("set-amenities <propertyId>")
  .description("Set amenities for a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/amenities/${id}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("supported-amenities")
  .description("List all supported amenities")
  .action(async () => {
    const data = await guestyFetch("/v1/properties-api/amenities/supported");
    print(data);
  });

properties
  .command("photos <propertyId>")
  .description("Get all photos for a property")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${id}`);
    print(data);
  });

properties
  .command("add-photos <propertyId>")
  .description("Add photos to a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${id}`, { method: "POST", body });
    print(data);
  });

properties
  .command("spaces <unitTypeId>")
  .description("Get spaces for a unit type")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties/spaces/unit-type/${id}`);
    print(data);
  });

properties
  .command("house-rules <unitTypeId>")
  .description("Get house rules for a unit type")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties/house-rules/unit-type/${id}`);
    print(data);
  });

properties
  .command("set-house-rules <unitTypeId>")
  .description("Update house rules (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties/house-rules/unit-type/${id}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("address <propertyId>")
  .description("Get property address")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/address/${id}`);
    print(data);
  });

properties
  .command("complexes")
  .description("List all complexes")
  .action(async () => {
    const data = await guestyFetch("/v1/properties-api/complexes");
    print(data);
  });

properties
  .command("complex <id>")
  .description("Get a complex by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/complexes/${id}`);
    print(data);
  });

properties
  .command("logs <propertyId>")
  .description("Get property logs")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/property-logs/${id}`);
    print(data);
  });

properties
  .command("custom-fields <propertyId>")
  .description("Get custom fields for a property")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/custom-fields/${id}`);
    print(data);
  });

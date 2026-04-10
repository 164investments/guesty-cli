import { readFileSync } from "node:fs";
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
  .command("amenity-groups")
  .description("List all available amenity groups")
  .action(async () => {
    const data = await guestyFetch("/v1/properties-api/amenities/groups");
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
  .command("order-photos <propertyId>")
  .description("Reorder photos on a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${id}/order`, { method: "POST", body });
    print(data);
  });

properties
  .command("update-photo <propertyId> <photoId>")
  .description("Replace a photo or update its caption (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, photoId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${propertyId}/${photoId}`, {
      method: "POST",
      body,
    });
    print(data);
  });

properties
  .command("delete-photo <propertyId> <photoId>")
  .description("Delete a property photo")
  .action(async (propertyId: string, photoId: string) => {
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${propertyId}/${photoId}`, {
      method: "DELETE",
    });
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
  .command("complex-spaces <complexId>")
  .description("Get spaces for a complex")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties/spaces/complex/${id}`);
    print(data);
  });

properties
  .command("bed-types")
  .description("List bed types")
  .action(async () => {
    const data = await guestyFetch("/v1/properties/spaces/bed-types");
    print(data);
  });

properties
  .command("room-types")
  .description("List room types")
  .action(async () => {
    const data = await guestyFetch("/v1/properties/spaces/room-types");
    print(data);
  });

properties
  .command("add-space <unitTypeId>")
  .description("Add a space to a unit type (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties/spaces/unit-type/${id}/add`, { method: "POST", body });
    print(data);
  });

properties
  .command("edit-space-details <spaceId>")
  .description("Edit space details (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties/spaces/space/${id}/details`, { method: "PATCH", body });
    print(data);
  });

properties
  .command("edit-space-beds <spaceId>")
  .description("Edit space beds (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties/spaces/space/${id}/edit`, { method: "POST", body });
    print(data);
  });

properties
  .command("remove-space <spaceId>")
  .description("Remove a space from its unit type (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties/spaces/space/${id}/remove`, { method: "POST", body });
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
  .command("list-house-rules")
  .description("List house rules")
  .action(async () => {
    const data = await guestyFetch("/v1/properties/house-rules/");
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
  .command("set-house-rules-bulk")
  .description("Update multiple unit-type house rules (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/properties/house-rules/", { method: "POST", body });
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
  .command("create-complex")
  .description("Create a complex (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/properties-api/complexes", { method: "POST", body });
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
  .command("update-complex <id>")
  .description("Update a complex (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/complexes/${id}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("delete-complex <id>")
  .description("Delete a complex")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/complexes/${id}`, { method: "DELETE" });
    print(data);
  });

properties
  .command("assign-complex <id>")
  .description("Assign property IDs to a complex (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/complexes/${id}/assign`, { method: "PUT", body });
    print(data);
  });

properties
  .command("unassign-complex <id>")
  .description("Unassign property IDs from a complex (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/complexes/${id}/unassign`, { method: "PUT", body });
    print(data);
  });

properties
  .command("logs <propertyId>")
  .description("Get property logs")
  .option("--from <date>", "From date (ISO 8601)")
  .option("--to <date>", "To date (ISO 8601)")
  .option("--user <userId>", "Filter by user ID")
  .option("--fields <fields>", "Comma-separated fields")
  .option("--limit <n>", "Max results")
  .option("--skip <n>", "Offset")
  .action(async (id: string, opts) => {
    const params: Record<string, string | number> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.user) params.user = opts.user;
    if (opts.fields) params.fields = opts.fields;
    if (opts.limit) params.limit = parseInt(opts.limit);
    if (opts.skip) params.skip = parseInt(opts.skip);
    const data = await guestyFetch(`/v1/property-logs/${id}`, { params });
    print(data);
  });

properties
  .command("custom-fields <propertyId>")
  .description("Get custom fields for a property")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/custom-fields/${id}`);
    print(data);
  });

properties
  .command("set-custom-fields <propertyId>")
  .description("Update property custom fields (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/custom-fields/${id}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("custom-field <propertyId> <fieldId>")
  .description("Get a single property custom field")
  .action(async (propertyId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/properties-api/custom-fields/${propertyId}/${fieldId}`);
    print(data);
  });

properties
  .command("delete-custom-field <propertyId> <fieldId>")
  .description("Delete a property custom field")
  .action(async (propertyId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/properties-api/custom-fields/${propertyId}/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });

properties
  .command("room-photos <propertyId>")
  .description("List room photos for a property")
  .action(async (propertyId: string) => {
    const data = await guestyFetch(`/v1/properties-api/room-photos/property/${propertyId}`);
    print(data);
  });

properties
  .command("room-photo <photoId>")
  .description("Get a room photo by ID")
  .action(async (photoId: string) => {
    const data = await guestyFetch(`/v1/properties-api/room-photos/photos/${photoId}`);
    print(data);
  });

properties
  .command("assign-room-photo <photoId>")
  .description("Assign a room photo to a space (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (photoId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/room-photos/photos/${photoId}/assign`, {
      method: "PUT",
      body,
    });
    print(data);
  });

properties
  .command("unassign-room-photo <photoId>")
  .description("Unassign a room photo from a space (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (photoId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/room-photos/photos/${photoId}/unassign`, {
      method: "PUT",
      body,
    });
    print(data);
  });

properties
  .command("create-group")
  .description("Create a property group (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/properties-api/groups/group", { method: "POST", body });
    print(data);
  });

properties
  .command("list-groups")
  .description("List property groups")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/properties-api/groups/group", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

properties
  .command("get-group <id>")
  .description("Get a property group by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/groups/group/${id}`);
    print(data);
  });

properties
  .command("delete-group <id>")
  .description("Delete a property group")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/properties-api/groups/group/${id}`, { method: "DELETE" });
    print(data);
  });

properties
  .command("update-group <id>")
  .description("Update a property group (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/groups/group/${id}`, { method: "PATCH", body });
    print(data);
  });

properties
  .command("list-external-links <propertyId>")
  .description("List external links for a property")
  .action(async (propertyId: string) => {
    const data = await guestyFetch(`/v1/properties-api/listing-settings/external-links/${propertyId}`);
    print(data);
  });

properties
  .command("create-external-link <propertyId>")
  .description("Create an external link for a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/listing-settings/external-links/${propertyId}`, { method: "POST", body });
    print(data);
  });

properties
  .command("reorder-external-links <propertyId>")
  .description("Reorder external links for a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/listing-settings/external-links/${propertyId}/order`, { method: "PUT", body });
    print(data);
  });

properties
  .command("update-external-link <propertyId> <linkId>")
  .description("Update an external link (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, linkId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/listing-settings/external-links/${propertyId}/${linkId}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("delete-external-link <propertyId> <linkId>")
  .description("Delete an external link")
  .action(async (propertyId: string, linkId: string) => {
    const data = await guestyFetch(`/v1/properties-api/listing-settings/external-links/${propertyId}/${linkId}`, { method: "DELETE" });
    print(data);
  });

properties
  .command("get-virtual-tour <propertyId>")
  .description("Get virtual tour for a property")
  .action(async (propertyId: string) => {
    const data = await guestyFetch(`/v1/properties-api/property-media/virtual-tour/${propertyId}`);
    print(data);
  });

properties
  .command("create-virtual-tour <propertyId>")
  .description("Create a virtual tour for a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/property-media/virtual-tour/${propertyId}`, { method: "POST", body });
    print(data);
  });

properties
  .command("update-virtual-tour <propertyId>")
  .description("Update a virtual tour for a property (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (propertyId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/properties-api/property-media/virtual-tour/${propertyId}`, { method: "PUT", body });
    print(data);
  });

properties
  .command("delete-virtual-tour <propertyId>")
  .description("Delete a virtual tour for a property")
  .action(async (propertyId: string) => {
    const data = await guestyFetch(`/v1/properties-api/property-media/virtual-tour/${propertyId}`, { method: "DELETE" });
    print(data);
  });

properties
  .command("upload-photo <propertyId>")
  .description("Upload a photo blob to a property (--data-file <path>)")
  .option("--data-file <path>", "Path to the image file to upload")
  .action(async (propertyId: string, opts) => {
    if (!opts.dataFile) {
      throw new Error("--data-file is required for upload-photo");
    }
    const body = readFileSync(opts.dataFile);
    const data = await guestyFetch(`/v1/properties-api/property-photos/property-photos/${propertyId}/upload/blob`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/octet-stream" },
    });
    print(data);
  });

# Delete imported calendar


    You can remove imported calendar with one of the following behaviors (strategies) regarding existing imported events.

# OpenAPI definition

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "GUESTY OPEN API",
    "description": "Guesty Open API documentation",
    "version": "1"
  },
  "servers": [
    {
      "url": "https://open-api.guesty.com/v1"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Calendar Sync (iCal import)"
    }
  ],
  "paths": {
    "/icalendar-api/imported-calendars/{importedCalendarId}": {
      "delete": {
        "operationId": "ImportedCalendarOpenApiController_deleteImportedCalendar",
        "summary": "Delete imported calendar",
        "description": "\n    You can remove imported calendar with one of the following behaviors (strategies) regarding existing imported events.",
        "parameters": [
          {
            "name": "strategy",
            "required": true,
            "in": "query",
            "description": "One of allowed approaches for deletion of imported calendar",
            "schema": {
              "enum": [
                "remove_all_channel_events",
                "remove_past_channel_events",
                "remove_future_channel_events",
                "preserve_channel_events"
              ],
              "type": "string"
            }
          },
          {
            "name": "importedCalendarId",
            "required": true,
            "in": "path",
            "description": "Id of an imported calendars",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Imported calendar deleted"
          },
          "204": {
            "description": ""
          },
          "404": {
            "description": "Imported calendar not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {}
                }
              }
            }
          }
        },
        "tags": [
          "Calendar Sync (iCal import)"
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "apiKey",
        "name": "authorization",
        "in": "header"
      }
    }
  }
}
```
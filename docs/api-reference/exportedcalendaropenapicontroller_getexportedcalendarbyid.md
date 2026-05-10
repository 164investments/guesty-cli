# Get a specific exported calendar


    Should return the state of an exported calendar entity by its id.
    If an exported calendar was removed, you will receive an error.
    

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
      "name": "Calendar Sync (iCal export)"
    }
  ],
  "paths": {
    "/icalendar-api/exported-calendars/{exportedCalendarId}": {
      "get": {
        "operationId": "ExportedCalendarOpenApiController_getExportedCalendarById",
        "summary": "Get a specific exported calendar",
        "description": "\n    Should return the state of an exported calendar entity by its id.\n    If an exported calendar was removed, you will receive an error.\n    ",
        "parameters": [
          {
            "name": "exportedCalendarId",
            "required": true,
            "in": "path",
            "description": "Id of an exported calendars",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Exported calendar found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "description": "Id of an exported calendar"
                    },
                    "listingId": {
                      "type": "string",
                      "description": "Related listing id"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Related account id"
                    },
                    "createdAt": {
                      "type": "string",
                      "description": "Time of creation of an exported calendar"
                    },
                    "updatedAt": {
                      "type": "string",
                      "description": "Time of last update of an exported calendar"
                    },
                    "url": {
                      "type": "string",
                      "description": "URL of an exported calendar"
                    },
                    "lastSyncedAt": {
                      "type": "string",
                      "description": "Timestamp of last successful sync of an exported calendar"
                    },
                    "adjustmentValueStart": {
                      "type": "number",
                      "description": "Defines offset for start date of exported calendar events"
                    },
                    "adjustmentValueEnd": {
                      "type": "number",
                      "description": "Defines offset for end date of exported calendar events"
                    }
                  },
                  "required": [
                    "id",
                    "listingId",
                    "accountId",
                    "createdAt",
                    "updatedAt",
                    "url",
                    "lastSyncedAt",
                    "adjustmentValueStart",
                    "adjustmentValueEnd"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Exported calendar not found",
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
          "Calendar Sync (iCal export)"
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
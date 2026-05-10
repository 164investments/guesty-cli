# Get imported calendar by id


      To retrieve data for a specific imported calendar, 
      including iCalendar name, URL, state & events adjustment, 
      use the following request

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
      "get": {
        "operationId": "ImportedCalendarOpenApiController_getImportedCalendarById",
        "summary": "Get imported calendar by id",
        "description": "\n      To retrieve data for a specific imported calendar, \n      including iCalendar name, URL, state & events adjustment, \n      use the following request",
        "parameters": [
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
            "description": "Get a specific imported calendar",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "description": "Id of an imported calendar"
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
                      "description": "Time of creation of an imported calendar"
                    },
                    "updatedAt": {
                      "type": "string",
                      "description": "Time of last update of an imported calendar properties"
                    },
                    "status": {
                      "enum": [
                        "active",
                        "paused",
                        "warning",
                        "suspended"
                      ],
                      "type": "string",
                      "description": "Status of an imported calendar"
                    },
                    "url": {
                      "type": "string",
                      "description": "URL of an imported calendar"
                    },
                    "name": {
                      "type": "string",
                      "description": "Name of an imported calendar"
                    },
                    "lastSyncedAt": {
                      "type": "string",
                      "description": "Timestamp of last successful sync of an imported calendar"
                    },
                    "adjustmentValueStart": {
                      "type": "number",
                      "description": "Defines offset for start date of imported calendar events"
                    },
                    "adjustmentValueEnd": {
                      "type": "number",
                      "description": "Defines offset for end date of imported calendar events"
                    }
                  },
                  "required": [
                    "id",
                    "listingId",
                    "accountId",
                    "createdAt",
                    "updatedAt",
                    "status",
                    "url",
                    "name",
                    "adjustmentValueStart",
                    "adjustmentValueEnd"
                  ]
                }
              }
            }
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
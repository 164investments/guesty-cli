# Update imported calendar


      If any adjustments are made to the values, the import sync process will be automatically triggered. 
      You can use this request to update the URL, name, or events adjustment of a specific imported calendar ID. 
      To pause or resume the import process, navigate to "Pause/Resume Imported-Calendar Sync." 
      Please note that you can only update the allowed properties that are listed below.

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
      "put": {
        "operationId": "ImportedCalendarOpenApiController_updateImportedCalendar",
        "summary": "Update imported calendar",
        "description": "\n      If any adjustments are made to the values, the import sync process will be automatically triggered. \n      You can use this request to update the URL, name, or events adjustment of a specific imported calendar ID. \n      To pause or resume the import process, navigate to \"Pause/Resume Imported-Calendar Sync.\" \n      Please note that you can only update the allowed properties that are listed below.",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 3
                  },
                  "adjustmentValueStart": {
                    "type": "number",
                    "enum": [
                      -2,
                      -1,
                      0,
                      1,
                      2
                    ]
                  },
                  "adjustmentValueEnd": {
                    "type": "number",
                    "enum": [
                      -2,
                      -1,
                      0,
                      1,
                      2
                    ]
                  }
                },
                "required": [
                  "name",
                  "adjustmentValueStart",
                  "adjustmentValueEnd"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Returns updated state of imported calendar",
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
            "description": "Listing not found",
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
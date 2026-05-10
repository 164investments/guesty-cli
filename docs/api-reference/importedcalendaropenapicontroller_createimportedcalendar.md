# Import a calendar


      To import external calendar events into Guesty Calendar via the iCalendar link,
      you must first create an imported-calendar entity. 
      This entity stores the import settings, such as the URL, calendar name, state, and events adjustment. 
      Once the entity is created, the import sync process will be initiated.

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
    "/icalendar-api/imported-calendars": {
      "post": {
        "operationId": "ImportedCalendarOpenApiController_createImportedCalendar",
        "summary": "Import a calendar",
        "description": "\n      To import external calendar events into Guesty Calendar via the iCalendar link,\n      you must first create an imported-calendar entity. \n      This entity stores the import settings, such as the URL, calendar name, state, and events adjustment. \n      Once the entity is created, the import sync process will be initiated.",
        "parameters": [],
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
                  "url": {
                    "type": "string"
                  },
                  "listingId": {
                    "type": "string"
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
                  "url",
                  "listingId",
                  "adjustmentValueStart",
                  "adjustmentValueEnd"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Imported calendar created successfully",
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
          "201": {
            "description": "",
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
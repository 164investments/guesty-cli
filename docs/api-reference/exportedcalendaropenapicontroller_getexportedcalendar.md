# Get active exported calendar


    Any listing can have only 1 exported calendar, composed by Guesty. 
    You can use the following request to retrieve an active exported-calendar for a specified listing. 
    Please, note, the response body will contain either an empty list, or a list with a single item - the exported calendar itself.
    You can use this endpoint to get currently active exported calendar, if you do not have its id.
    

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
    "/icalendar-api/exported-calendars": {
      "get": {
        "operationId": "ExportedCalendarOpenApiController_getExportedCalendar",
        "summary": "Get active exported calendar",
        "description": "\n    Any listing can have only 1 exported calendar, composed by Guesty. \n    You can use the following request to retrieve an active exported-calendar for a specified listing. \n    Please, note, the response body will contain either an empty list, or a list with a single item - the exported calendar itself.\n    You can use this endpoint to get currently active exported calendar, if you do not have its id.\n    ",
        "parameters": [
          {
            "name": "listingId",
            "required": true,
            "in": "query",
            "description": "Id of a listing to get exported calendars for",
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
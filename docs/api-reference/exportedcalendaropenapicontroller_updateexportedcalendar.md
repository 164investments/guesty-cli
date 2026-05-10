# Update exported calendar


    If adjustment values are updated, the export sync process will be triggered. 
    Use this request to update events adjustment of your exported Guesty calendar. 
    Please note you can update only the parameters listed below.
    

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
      "put": {
        "operationId": "ExportedCalendarOpenApiController_updateExportedCalendar",
        "summary": "Update exported calendar",
        "description": "\n    If adjustment values are updated, the export sync process will be triggered. \n    Use this request to update events adjustment of your exported Guesty calendar. \n    Please note you can update only the parameters listed below.\n    ",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
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
                  "adjustmentValueStart",
                  "adjustmentValueEnd"
                ]
              }
            }
          }
        },
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
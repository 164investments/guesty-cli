# Create exported calendar link


    When you export your Guesty calendar to an external service, 
    the events from the Guesty calendar will block the external calendar. 
    You must create an exported calendar entity to export data from Guesty via the iCalendar link. 
    This entity stores the settings used during the export process, such as the URL, state, and adjustments.
    Once the entity is created, the export sync process will be triggered. 
    Please note that you can only have one exported calendar per listing. 
    After posting your request, you will receive an exported calendar descriptor, which includes the URL property. 
    You will use this URL in your other services to pull data from Guesty.
    

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
      "post": {
        "operationId": "ExportedCalendarOpenApiController_createExportedCalendar",
        "summary": "Create exported calendar link",
        "description": "\n    When you export your Guesty calendar to an external service, \n    the events from the Guesty calendar will block the external calendar. \n    You must create an exported calendar entity to export data from Guesty via the iCalendar link. \n    This entity stores the settings used during the export process, such as the URL, state, and adjustments.\n    Once the entity is created, the export sync process will be triggered. \n    Please note that you can only have one exported calendar per listing. \n    After posting your request, you will receive an exported calendar descriptor, which includes the URL property. \n    You will use this URL in your other services to pull data from Guesty.\n    ",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "listingId": {
                    "type": "string",
                    "description": "Listing id"
                  },
                  "adjustmentValueStart": {
                    "type": "number",
                    "enum": [
                      -2,
                      -1,
                      0,
                      1,
                      2
                    ],
                    "description": "Start date offset"
                  },
                  "adjustmentValueEnd": {
                    "type": "number",
                    "enum": [
                      -2,
                      -1,
                      0,
                      1,
                      2
                    ],
                    "description": "End date offset"
                  }
                },
                "required": [
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
            "description": "Exported calendar created successfully",
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
          "201": {
            "description": "",
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
          "401": {
            "description": "Client unauthorized"
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
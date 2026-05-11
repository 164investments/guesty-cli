# Delete exported calendar


    Keep in mind - when you remove an exported calendar, any services that use its URL will encounter a 404 error.
    To permanently delete the exported calendar, use the following request.

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
      "delete": {
        "operationId": "ExportedCalendarOpenApiController_deleteExportedCalendar",
        "summary": "Delete exported calendar",
        "description": "\n    Keep in mind - when you remove an exported calendar, any services that use its URL will encounter a 404 error.\n    To permanently delete the exported calendar, use the following request.",
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
            "description": "Exported calendar deleted"
          },
          "204": {
            "description": ""
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
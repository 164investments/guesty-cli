# Get check-in form summary by reservation id

Get url and filename of the check-in form summary. Url is valid for 1 hour.

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
      "name": "Guest app"
    }
  ],
  "paths": {
    "/guest-app-api/guest-app-runtime/{reservationId}/module/{moduleType}/summary": {
      "get": {
        "operationId": "GuestAppOpenApiController_getCifSummaryDetails",
        "summary": "Get check-in form summary by reservation id",
        "tags": [
          "Guest app"
        ],
        "description": "Get url and filename of the check-in form summary. Url is valid for 1 hour.",
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "path",
            "description": "Reservation id",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "moduleType",
            "required": true,
            "in": "path",
            "description": "Module type",
            "schema": {
              "enum": [
                "check_in"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Details of check-in form summary file",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "url": {
                      "type": "string",
                      "description": "Url to fetch check-in form summary PDF. Valid 1 hour"
                    },
                    "fileName": {
                      "type": "string",
                      "example": "checkinform_My Guest App_James_Doe.pdf",
                      "description": "Name of check-in form summary PDF"
                    }
                  },
                  "required": [
                    "url",
                    "fileName"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Can not pull details, unauthorized"
          },
          "404": {
            "description": "Check-in form summary not found"
          }
        }
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
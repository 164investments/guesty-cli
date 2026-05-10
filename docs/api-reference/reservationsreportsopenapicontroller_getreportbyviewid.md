# Get reservations report by view id

Retrieves a report of reservations based on the view ID

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
      "name": "Reservations Reports Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-reports/{viewId}": {
      "get": {
        "operationId": "ReservationsReportsOpenApiController_getReportByViewId",
        "summary": "Get reservations report by view id",
        "description": "Retrieves a report of reservations based on the view ID",
        "parameters": [
          {
            "name": "viewId",
            "required": true,
            "in": "path",
            "description": "The ID of the view to get the report for",
            "schema": {
              "title": "View ID",
              "example": "67b5d6155383c8aa4cfecd0d",
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "The maximum number of results to return",
            "schema": {
              "minimum": 1,
              "title": "Limit",
              "example": "100",
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "The number of results to skip",
            "schema": {
              "minimum": 0,
              "title": "Skip",
              "example": "5",
              "type": "number"
            }
          },
          {
            "name": "timezone",
            "required": true,
            "in": "query",
            "description": "The timezone to use for the report. Select the relevant entry from [this list](https://gist.github.com/diogocapela/12c6617fc87607d11fd62d2a4f42b02a)",
            "schema": {
              "title": "Timezone",
              "example": "Asia/Jerusalem",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "example": [
                        {
                          "_id": "67ab1fc34f984e5db903ff65",
                          "accountId": "5ca6f23b36222c1886bbca94",
                          "checkIn": "2025-02-25 05:00 PM",
                          "checkOut": "2025-02-27 12:00 PM",
                          "confirmationCode": "GY-zuGNvW8a",
                          "guest": {
                            "name": "Arnold Guest",
                            "withAvatar": false
                          },
                          "listing": {
                            "img": "https://assets.guesty.com/image/upload/example.jpg",
                            "name": "My Listing",
                            "withAvatar": true
                          },
                          "listingId": "65b7a04dfb984a0010ef6504",
                          "status": "confirmed",
                          "timezone": "America/Chicago"
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "total": {
                      "type": "number"
                    },
                    "limit": {
                      "type": "number"
                    },
                    "skip": {
                      "type": "number"
                    },
                    "viewId": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "results",
                    "total",
                    "limit",
                    "skip",
                    "viewId"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Returned if required fields are missing or there is a validation error in the request"
          },
          "500": {
            "description": "Indicates server-side error while processing the request"
          }
        },
        "tags": [
          "Reservations Reports Open Api [Beta]"
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
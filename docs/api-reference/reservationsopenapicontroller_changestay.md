# Change Reservation Guest Stay Status

Change the guest stay status of the reservation

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
      "name": "Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/guest-stay": {
      "put": {
        "operationId": "ReservationsOpenApiController_changeStay",
        "summary": "Change Reservation Guest Stay Status",
        "description": "Change the guest stay status of the reservation",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reservationId": {
                    "type": "string",
                    "description": "Guesty reservation ID",
                    "example": "5acca18ffe1641001f17a999"
                  },
                  "status": {
                    "enum": [
                      "not_set",
                      "checked_in",
                      "checked_out",
                      "no_show"
                    ],
                    "type": "string",
                    "description": "Set the guest stay status. Choose from: “not_set”, “checked_in”, “checked_out”, or “no_show”",
                    "example": "checked_in"
                  }
                },
                "required": [
                  "reservationId",
                  "status"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "example": {}
                }
              }
            }
          },
          "400": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "422": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "500": {
            "description": "Indicates server-side error while processing the request"
          }
        },
        "tags": [
          "Reservations Open Api [Beta]"
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
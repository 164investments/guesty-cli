# Update reservation confirmation code

Update the confirmation code of a reservation

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
    "/reservations-v3/{reservationId}/confirmation-code": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationConfirmationCode",
        "summary": "Update reservation confirmation code",
        "description": "Update the confirmation code of a reservation",
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "path",
            "description": "The Guesty reservation ID",
            "schema": {
              "example": "5f92cbf10cf217478ba93561",
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
                  "confirmationCode": {
                    "type": "string",
                    "minLength": 5,
                    "maxLength": 30,
                    "description": "The confirmation code for the reservation, max length is 30 characters",
                    "example": "ABCDE-12345"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation Confirmation Code Updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reservationId": {
                      "type": "string"
                    },
                    "confirmationCode": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "reservationId",
                    "confirmationCode"
                  ]
                }
              }
            }
          },
          "422": {
            "description": "Validation error failed updating confirmation code."
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
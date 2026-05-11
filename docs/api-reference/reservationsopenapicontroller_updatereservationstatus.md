# Update reservation status

Update the status of a reservation to one of the supported statuses

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
    "/reservations-v3/{reservationId}/status": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationStatus",
        "summary": "Update reservation status",
        "description": "Update the status of a reservation to one of the supported statuses",
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
                  "status": {
                    "enum": [
                      "confirmed",
                      "reserved",
                      "awaiting_payment",
                      "inquiry",
                      "canceled",
                      "closed",
                      "declined",
                      "expired"
                    ],
                    "type": "string",
                    "description": "Status of the reservation",
                    "example": "confirmed"
                  },
                  "canceledBy": {
                    "enum": [
                      "OWNER",
                      "GUEST",
                      "TEAM_MEMBER"
                    ],
                    "type": "string",
                    "description": "The person who cancelled reservation, if not defined will be TEAM MEMBER by default",
                    "example": "GUEST"
                  },
                  "cancellationReason": {
                    "type": "string",
                    "description": "The reason for cancelling a reservation",
                    "example": "OTA Policy"
                  },
                  "cancellationNote": {
                    "type": "string",
                    "description": "The note for cancelling a reservation",
                    "example": "Personal changes"
                  }
                },
                "required": [
                  "status"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation Status Updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reservationId": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
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
          "422": {
            "description": "Validation error failed updating status."
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
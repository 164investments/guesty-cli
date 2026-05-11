# Get all custom fields for a reservation

Get all custom fields for a reservation

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
    "/reservations-v3/{reservationId}/custom-fields": {
      "get": {
        "operationId": "ReservationsOpenApiController_getReservationAllCustomFields",
        "summary": "Get all custom fields for a reservation",
        "description": "Get all custom fields for a reservation",
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
        "responses": {
          "200": {
            "description": "Reservation all custom fields retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reservationId": {
                      "type": "string",
                      "description": "The Guesty reservation ID",
                      "example": "5f92cbf10cf217478ba93561"
                    },
                    "customFields": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string"
                          },
                          "fieldId": {
                            "type": "string"
                          },
                          "value": {
                            "type": "object"
                          }
                        },
                        "required": [
                          "_id",
                          "fieldId",
                          "value"
                        ]
                      }
                    }
                  },
                  "required": [
                    "reservationId",
                    "customFields"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Reservation not found"
          },
          "422": {
            "description": "Validation error - failed retrieving custom fields."
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
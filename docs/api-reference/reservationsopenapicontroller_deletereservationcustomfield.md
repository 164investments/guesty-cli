# Delete reservation's Custom Field

Delete an existing custom field from a reservation.

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
    "/reservations-v3/{reservationId}/custom-fields/{fieldId}": {
      "delete": {
        "operationId": "ReservationsOpenApiController_deleteReservationCustomField",
        "summary": "Delete reservation's Custom Field",
        "description": "Delete an existing custom field from a reservation.",
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
          },
          {
            "name": "fieldId",
            "required": true,
            "in": "path",
            "description": "The custom field ID",
            "schema": {
              "example": "5fa02fa358d2db673e17bc2d",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation Custom Field Deleted",
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
            "description": "Reservation or custom field not found"
          },
          "422": {
            "description": "Validation error - failed deleting custom field."
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
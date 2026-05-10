# Update reservation's Custom Fields

Edit the values of any custom fields on an existing reservation.

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
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationCustomFields",
        "summary": "Update reservation's Custom Fields",
        "description": "Edit the values of any custom fields on an existing reservation.",
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
                  "customFields": {
                    "minItems": 1,
                    "description": "Custom fields of the reservation",
                    "example": [
                      {
                        "fieldId": "5fa02fa358d2db673e17bc2d",
                        "value": "Including Jacuzzi"
                      }
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "fieldId": {
                          "type": "string",
                          "description": "The ID of the custom field",
                          "example": "65fab102a5284d73c6206db0"
                        },
                        "value": {
                          "description": "The custom field value that should assigned. Can be a string, number, boolean, ObjectId, or Date.",
                          "oneOf": [
                            {
                              "type": "string",
                              "example": "some custom field value"
                            },
                            {
                              "type": "number",
                              "example": 42
                            },
                            {
                              "type": "boolean",
                              "example": true
                            },
                            {
                              "type": "string",
                              "example": "65fab102a5284d73c6206db0"
                            }
                          ]
                        }
                      },
                      "required": [
                        "fieldId",
                        "value"
                      ]
                    }
                  }
                },
                "required": [
                  "customFields"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation Custom Fields Updated",
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
          "422": {
            "description": "Validation error - failed updating custom fields."
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
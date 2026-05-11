# Update Reservation notes

Update reservation notes, including the key code and special requests fields

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
    "/reservations-v3/{reservationId}/notes": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationNotes",
        "summary": "Update Reservation notes",
        "description": "Update reservation notes, including the key code and special requests fields",
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
                  "notes": {
                    "description": "Object which contains the various types of notes",
                    "example": {
                      "other": "Other notes",
                      "cleaning": "Cleaning notes",
                      "guest": "Guest notes",
                      "specialRequests": "Special request",
                      "keyCode": "123456"
                    },
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "other": {
                            "type": "string",
                            "description": "Other notes",
                            "example": "Other notes"
                          },
                          "cleaning": {
                            "type": "string",
                            "description": "Notes for cleaning",
                            "example": "Cleaning notes"
                          },
                          "guest": {
                            "type": "string",
                            "description": "For notes about the guest",
                            "example": "Guest notes"
                          },
                          "specialRequests": {
                            "type": "string",
                            "description": "For recording the guest's special requests",
                            "example": "Special request"
                          },
                          "keyCode": {
                            "type": "string",
                            "description": "Store the relevant key code for using with workflow automation",
                            "example": "123456"
                          },
                          "doneBy": {
                            "type": "string",
                            "description": "The name of the Guesty user"
                          }
                        }
                      }
                    ]
                  }
                },
                "required": [
                  "notes"
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
                  "type": "object",
                  "properties": {
                    "reservationId": {
                      "type": "string"
                    },
                    "notes": {
                      "type": "object"
                    }
                  },
                  "required": [
                    "reservationId",
                    "notes"
                  ]
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
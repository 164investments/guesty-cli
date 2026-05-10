# Get guest code

Get guest code data for reservations with future check-out times, by reservation ID.
      Note: The main guest codes are codes with "purpose" set to "GUEST".
      Codes with "purpose" set to "GUEST_BACKUP" are codes to share with guests in case the "GUEST" code has errors, starting from the check-in day.
      "GUEST_BACKUP" codes are a dynamic pool of codes associated with reservations on check-in day. When fetching a "GUEST_BACKUP" code before the check-in day, the code is not guaranteed to stay the same until the check-in day.

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
      "name": "Guesty Locks Manager"
    }
  ],
  "paths": {
    "/guest-code": {
      "get": {
        "operationId": "ReservationAccessCodeController_getLocksAndCodesByReservation",
        "summary": "Get guest code",
        "description": "Get guest code data for reservations with future check-out times, by reservation ID.\n      Note: The main guest codes are codes with \"purpose\" set to \"GUEST\".\n      Codes with \"purpose\" set to \"GUEST_BACKUP\" are codes to share with guests in case the \"GUEST\" code has errors, starting from the check-in day.\n      \"GUEST_BACKUP\" codes are a dynamic pool of codes associated with reservations on check-in day. When fetching a \"GUEST_BACKUP\" code before the check-in day, the code is not guaranteed to stay the same until the check-in day.",
        "tags": [
          "Guesty Locks Manager"
        ],
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "query",
            "description": "Reservation ID for which the guest code is needed",
            "example": "5f9b2b3b9c6b4e000f1e3b1e",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "codes": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "code": {
                            "type": "string"
                          },
                          "purpose": {
                            "type": "string"
                          },
                          "status": {
                            "type": "string"
                          },
                          "startsAt": {
                            "format": "date-time",
                            "type": "string",
                            "nullable": true
                          },
                          "endsAt": {
                            "format": "date-time",
                            "type": "string",
                            "nullable": true
                          },
                          "lockIds": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          }
                        },
                        "required": [
                          "code",
                          "purpose",
                          "status",
                          "startsAt",
                          "endsAt",
                          "lockIds"
                        ]
                      }
                    },
                    "locks": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "name": {
                            "type": "string"
                          },
                          "batteryLevel": {
                            "type": "number"
                          },
                          "online": {
                            "type": "boolean"
                          },
                          "provider": {
                            "type": "string"
                          },
                          "imageUrl": {
                            "type": "string",
                            "nullable": true
                          },
                          "hasIssues": {
                            "type": "boolean",
                            "nullable": true
                          }
                        },
                        "required": [
                          "id",
                          "name",
                          "batteryLevel",
                          "online",
                          "provider",
                          "imageUrl"
                        ]
                      }
                    }
                  },
                  "required": [
                    "codes",
                    "locks"
                  ]
                }
              }
            }
          },
          "204": {
            "description": "The reservation does not have associated guest codes"
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Bad Request"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "reservationId must be a mongodb id"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Can't find reservation, by provided ID",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Can't find reservation with ID {reservation_id}"
                        },
                        "status": {
                          "type": "number",
                          "example": 404
                        }
                      },
                      "required": [
                        "message",
                        "status"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
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
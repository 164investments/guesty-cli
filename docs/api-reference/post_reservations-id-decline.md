# Decline a pending booking request

Use this call to deny a pending reservation request. Only reservation with status 'reserved' can be declined

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
      "name": "Reservations"
    }
  ],
  "paths": {
    "/reservations/{id}/decline": {
      "post": {
        "tags": [
          "Reservations"
        ],
        "summary": "Decline a pending booking request",
        "description": "Use this call to deny a pending reservation request. Only reservation with status 'reserved' can be declined",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Reservation ID",
            "example": "5fa02fa358d2db673e17bc2d",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation object - _id and status fields",
            "content": {
              "application/json": {
                "example": "{\n    \"_id\": \"5fa02fa358d2db673e17bc2d\",\n    \"status\": \"DECLINED\",\n}"
              }
            }
          },
          "400": {
            "description": "Invalid Input",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Reservation status is approved - can't decline"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string"
                        },
                        "message": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "required": [
                    "error"
                  ],
                  "example": {
                    "error": {
                      "code": "UNAUTHORIZED",
                      "message": "Unauthorized"
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Forbidden"
                }
              }
            }
          },
          "404": {
            "description": "Not Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Reservation not found"
                }
              }
            }
          },
          "500": {
            "description": "Unhandled exception. Something went wrong on server.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Internal Server Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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
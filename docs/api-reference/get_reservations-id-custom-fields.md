# Retrieve all populated custom fields on an existing reservation.

For retrieving custom fields, use the <a href="https://open-api-docs.guesty.com/reference/reservationsopenapicontroller_getreservationallcustomfields">new API</a>

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
    "/reservations/{id}/custom-fields": {
      "get": {
        "deprecated": true,
        "tags": [
          "Reservations"
        ],
        "summary": "Retrieve all populated custom fields on an existing reservation.",
        "description": "For retrieving custom fields, use the <a href=\"https://open-api-docs.guesty.com/reference/reservationsopenapicontroller_getreservationallcustomfields\">new API</a>",
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
            "description": "Custom fields of reservation",
            "content": {
              "application/json": {
                "example": "[\n    {\n      \"fieldId\": \"5dc03b42e28baf001e2b35d0\",\n        \"value\": \"Same day check-ins may not be eligible for early or late check-in/outs. Please be courteous and ask the Team if its possible.\"\n    },\n    {\n        \"fieldId\": \"5dc03b0f628338001fb6b13f\",\n        \"value\": \"NO DOGS ALLOWED\"\n    }\n]"
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
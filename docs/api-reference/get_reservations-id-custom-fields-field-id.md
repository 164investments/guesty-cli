# Get custom field - Reservations

For retrieving a specific custom field, use the <a href="https://open-api-docs.guesty.com/reference/reservationsopenapicontroller_getreservationcustomfield">new API</a>

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
    "/reservations/{id}/custom-fields/{field_id}": {
      "get": {
        "deprecated": true,
        "tags": [
          "Reservations"
        ],
        "summary": "Get custom field - Reservations",
        "description": "For retrieving a specific custom field, use the <a href=\"https://open-api-docs.guesty.com/reference/reservationsopenapicontroller_getreservationcustomfield\">new API</a>",
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
          },
          {
            "in": "path",
            "name": "field_id",
            "description": "Field ID",
            "example": "63c6bc609e4384007c620a95",
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
                "example": "{\n    \"_id\": \"63c6bc609e4384007c620a95\",\n    \"fieldId\": \"5dc03b42e28baf001e2b35d0\",\n    \"value\": \"Same day check-ins may not be eligible for early or late check-in/outs. Please be courteous and ask the Team if its possible.\"\n}"
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
                  "example": "Not found"
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
# Send results in email

Use this request to export a custom list of reservations in an Email. Results are limited to 250 reservations per a request.

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
    "/reservations.email": {
      "post": {
        "tags": [
          "Reservations"
        ],
        "summary": "Send results in email",
        "description": "Use this request to export a custom list of reservations in an Email. Results are limited to 250 reservations per a request.",
        "requestBody": {
          "description": "Reservation new values",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "to": {
                    "type": "string",
                    "description": "Address of recipient"
                  }
                },
                "required": [
                  "to"
                ],
                "example": {
                  "to": "koby@guesty.com"
                }
              }
            }
          }
        },
        "parameters": [
          {
            "name": "filters",
            "in": "query",
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "field": {
                    "type": "string",
                    "description": "Subject of the filter",
                    "example": "checkIn"
                  },
                  "operator": {
                    "type": "string",
                    "description": "Enhanced MongoDB comparison operator: $eq, $not, $contains, $notcontains, $gt, $lt, $between\n\n **IMPORTANT NOTE:**\n In order to use the $between operator please check the syntax of the example below:\n `[{\"field\":\"checkIn\", \"operator\":\"$between\",\"from\":\"2023-03-02T00:00:00%2B01:00\",\"to\":\"2023-03-02T23:59:59%2B01:00\"}]`",
                    "example": "$gt"
                  },
                  "value": {
                    "type": "string",
                    "description": "Value to filter by",
                    "example": "2025-09-10T12:49:44.616Z"
                  },
                  "context": {
                    "type": "string",
                    "description": "Optional preprocessing. Options are now, createdAt, confirmedAt, canceledAt, alteredAt. When given, the date in value is relative to the context.",
                    "default": null,
                    "example": "now"
                  }
                }
              },
              "required": [
                "field",
                "operator",
                "value"
              ]
            },
            "description": "Array of filters to query by"
          },
          {
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of fields, separated by space",
            "example": "checkIn checkOut confirmationCode guest.fullname listing.title"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Sorting, default: `checkIn`",
            "example": "checkIn"
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "description": "Limit for list of records. Default value: `250`, max: `500`",
            "example": "100"
          },
          {
            "in": "query",
            "name": "skip",
            "schema": {
              "type": "integer"
            },
            "example": "100",
            "description": "Skip number of records. In case nothing provided so nothing will be skipped"
          }
        ],
        "responses": {
          "200": {
            "description": "Array of reservations objects",
            "content": {
              "application/json": {}
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
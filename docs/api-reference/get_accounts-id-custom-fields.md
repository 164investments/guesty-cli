# Get All Custom Fields

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
      "name": "Accounts"
    }
  ],
  "paths": {
    "/accounts/{id}/custom-fields": {
      "get": {
        "tags": [
          "Accounts"
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "e.g. - Account id"
          }
        ],
        "summary": "Get All Custom Fields",
        "responses": {
          "200": {
            "description": "Custom Fields Array",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "fieldId": {
                        "type": "string"
                      },
                      "displayName": {
                        "type": "string"
                      },
                      "isPublic": {
                        "type": "boolean"
                      },
                      "key": {
                        "type": "string"
                      },
                      "object": {
                        "type": "string",
                        "enum": [
                          "listing",
                          "reservation"
                        ]
                      },
                      "options": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "user",
                          "boolean",
                          "enum",
                          "longtext",
                          "date",
                          "text",
                          "time",
                          "contact",
                          "number"
                        ]
                      }
                    }
                  }
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
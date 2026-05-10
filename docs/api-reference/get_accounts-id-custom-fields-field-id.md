# Get Custom Field

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
    "/accounts/{id}/custom-fields/{field_id}": {
      "get": {
        "tags": [
          "Accounts"
        ],
        "summary": "Get Custom Field",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "field_id",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Custom Field",
            "content": {
              "application/json": {
                "schema": {
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
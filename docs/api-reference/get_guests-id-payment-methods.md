# List guest's payment methods

Retrieve payment method list by guest id

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
      "name": "Guests"
    }
  ],
  "paths": {
    "/guests/{id}/payment-methods": {
      "get": {
        "tags": [
          "Guests"
        ],
        "summary": "List guest's payment methods",
        "description": "Retrieve payment method list by guest id",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "description": "Guest ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reuse",
            "in": "query",
            "description": "Retrieve methods allowed for reusage in other guest's reservations",
            "required": false,
            "example": true,
            "schema": {
              "type": "boolean",
              "default": true
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of payment methods"
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
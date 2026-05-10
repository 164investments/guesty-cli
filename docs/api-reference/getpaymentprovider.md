# Get payment provider by id

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
      "name": "Payment providers"
    }
  ],
  "paths": {
    "/payment-providers/{providerId}": {
      "get": {
        "tags": [
          "Payment providers"
        ],
        "summary": "Get payment provider by id",
        "operationId": "getPaymentProvider",
        "parameters": [
          {
            "name": "providerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "default": "5ee77a05825236b6d5aab005"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Response received",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "required": [
                    "_id"
                  ],
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string"
                    },
                    "accountName": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "isDefault": {
                      "type": "boolean"
                    },
                    "listingsCount": {
                      "type": "number"
                    },
                    "paymentMethodsCount": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
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
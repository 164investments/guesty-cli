# Get provider stats

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
    "/payment-providers/stats": {
      "get": {
        "tags": [
          "Payment providers"
        ],
        "summary": "Get provider stats",
        "operationId": "getStats",
        "responses": {
          "200": {
            "description": "Response received",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "required": [
                    "data",
                    "limit",
                    "skip",
                    "total"
                  ],
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
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
                    },
                    "limit": {
                      "type": "number"
                    },
                    "skip": {
                      "type": "number"
                    },
                    "total": {
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
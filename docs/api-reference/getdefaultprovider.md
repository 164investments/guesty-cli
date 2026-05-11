# Get default payment provider

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
    "/payment-providers/default": {
      "get": {
        "tags": [
          "Payment providers"
        ],
        "summary": "Get default payment provider",
        "operationId": "getDefaultProvider",
        "responses": {
          "200": {
            "description": "Response received",
            "content": {}
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
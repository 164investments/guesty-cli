# Get account channel commission

Get account channel commission.

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
      "name": "Channel Commission"
    }
  ],
  "paths": {
    "/channel-commission/account": {
      "get": {
        "operationId": "ChannelCommissionController_getAccountChannelCommission",
        "summary": "Get account channel commission",
        "description": "Get account channel commission.",
        "parameters": [],
        "responses": {
          "200": {
            "description": "The account channel commission."
          },
          "400": {
            "description": "The params provided are invalid."
          }
        },
        "tags": [
          "Channel Commission"
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
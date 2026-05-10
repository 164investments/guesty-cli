# Get listings channel commission

Get channel commission from multiple listings.

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
    "/channel-commissions-v2/listings": {
      "get": {
        "operationId": "ChannelCommissionController_getListingsChannelCommission1",
        "summary": "Get listings channel commission",
        "description": "Get channel commission from multiple listings.",
        "parameters": [
          {
            "name": "listingIds",
            "required": true,
            "in": "query",
            "description": "The desired listing ids",
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The array of the channel commission per listing."
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
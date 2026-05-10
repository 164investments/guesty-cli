# List custom channel names

Retrieve a list of custom channel names for the account

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
      "name": "Review"
    }
  ],
  "paths": {
    "/reviews/custom-channels": {
      "get": {
        "operationId": "ReviewController_listCustomChannelNames",
        "summary": "List custom channel names",
        "description": "Retrieve a list of custom channel names for the account",
        "parameters": [],
        "responses": {
          "200": {
            "description": "List Custom Channel Names Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "customChannelNames": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "required": [
                    "customChannelNames"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        },
        "tags": [
          "Review"
        ],
        "security": [
          {
            "authorization-token": []
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
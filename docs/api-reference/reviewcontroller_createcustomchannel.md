# Create a custom channel

Create a custom channel for an account

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
      "post": {
        "operationId": "ReviewController_createCustomChannel",
        "summary": "Create a custom channel",
        "description": "Create a custom channel for an account",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "customChannelName": {
                    "type": "string",
                    "format": "string",
                    "description": "Custom Channel Name",
                    "example": "marketing_website_a"
                  }
                },
                "required": [
                  "customChannelName"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Custom Channel Created"
          },
          "401": {
            "description": "Unauthorized"
          },
          "409": {
            "description": "Custom Channel Already Exists"
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
# List room-types

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
      "name": "Spaces"
    }
  ],
  "paths": {
    "/properties/spaces/room-types": {
      "get": {
        "tags": [
          "Spaces"
        ],
        "summary": "List room-types",
        "responses": {
          "200": {
            "description": "Array of all available room types. Note: 'SHARED_SPACE' is shown on channels as 'Living room'.",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "array",
                  "example": [
                    "BEDROOM",
                    "SHARED_SPACE"
                  ],
                  "description": "Available room types. Note: 'SHARED_SPACE' is shown on channels as 'Living room'.",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
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
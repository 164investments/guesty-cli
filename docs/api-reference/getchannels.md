# Retrieve a list of supported channels.

Retrieve a list of supported channels.

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
      "name": "Marketing fields"
    }
  ],
  "paths": {
    "/marketing/channels": {
      "get": {
        "operationId": "getChannels",
        "summary": "Retrieve a list of supported channels.",
        "description": "Retrieve a list of supported channels.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [],
        "responses": {
          "200": {
            "description": "Return a list of supported channels",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "slug": {
                        "type": "string"
                      }
                    },
                    "example": {
                      "name": "Airbnb",
                      "slug": "airbnb"
                    }
                  },
                  "example": [
                    {
                      "name": "Airbnb",
                      "slug": "airbnb"
                    }
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "example": "UNAUTHORIZED"
                        },
                        "message": {
                          "type": "string",
                          "example": "Unauthorized"
                        }
                      }
                    }
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
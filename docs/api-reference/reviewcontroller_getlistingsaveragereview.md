# Retrieve Average reviews score by Listings IDs

Retrieve Average reviews score by Listings IDs

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
    "/reviews/listings-average": {
      "get": {
        "operationId": "ReviewController_getListingsAverageReview",
        "summary": "Retrieve Average reviews score by Listings IDs",
        "description": "Retrieve Average reviews score by Listings IDs",
        "parameters": [
          {
            "name": "listingIds",
            "required": true,
            "in": "query",
            "description": "Guesty Listing IDs array",
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "includeCustomChannels",
            "required": false,
            "in": "query",
            "description": "Include custom channels in search",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get Average Reviews Score Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "listingId": {
                      "type": "string"
                    },
                    "avg": {
                      "type": "number"
                    },
                    "total": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "listingId",
                    "avg",
                    "total"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Not Found"
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
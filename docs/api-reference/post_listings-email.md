# Send results in email

Same as /listings but results are sent as an email

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
      "name": "Listings"
    }
  ],
  "paths": {
    "/listings.email": {
      "post": {
        "tags": [
          "Listings"
        ],
        "summary": "Send results in email",
        "description": "Same as /listings but results are sent as an email",
        "requestBody": {
          "description": "Listing new values",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "to": {
                    "description": "Address of recipient",
                    "required": [
                      "to"
                    ],
                    "example": "koby@guesty.com"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Array of listing objects",
            "content": {
              "application/json": {}
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
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
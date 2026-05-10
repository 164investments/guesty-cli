# List all cities

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
    "/listings/cities": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "List all cities",
        "responses": {
          "200": {
            "description": "Array of cities (strings).",
            "content": {
              "application/json": {
                "example": [
                  "Burnt Ranch",
                  "New York",
                  "Autun",
                  "Kfar Sirkin",
                  "London",
                  "Newton",
                  "Atlanta",
                  "Montpelier",
                  "Tel Aviv-Yafo",
                  "Decatur",
                  "Vancouver",
                  "Amsterdam",
                  "Cuyahoga Falls",
                  "Palo Alto",
                  "Ramat Gan"
                ]
              }
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
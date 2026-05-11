# List bed-types

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
    "/properties/spaces/bed-types": {
      "get": {
        "tags": [
          "Spaces"
        ],
        "summary": "List bed-types",
        "responses": {
          "200": {
            "description": "Array of all available bed types.",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "array",
                  "example": [
                    "KING_BED",
                    "QUEEN_BED",
                    "DOUBLE_BED",
                    "SINGLE_BED",
                    "SOFA_BED",
                    "AIR_MATTRESS",
                    "BUNK_BED",
                    "FLOOR_MATTRESS",
                    "WATER_BED",
                    "TODDLER_BED",
                    "CRIB"
                  ],
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
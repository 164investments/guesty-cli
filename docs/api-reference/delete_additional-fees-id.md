# Delete existing additional fee

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
      "name": "AdditionalFees"
    }
  ],
  "paths": {
    "/additional-fees/{id}": {
      "delete": {
        "tags": [
          "AdditionalFees"
        ],
        "summary": "Delete existing additional fee",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "id of item to remove",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Additional fee item deleted"
          },
          "400": {
            "description": "Invalid input"
          },
          "404": {
            "description": "Not found"
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
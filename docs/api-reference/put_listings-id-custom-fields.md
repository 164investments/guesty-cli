# Update listing's Custom Fields

Soon to be deprecated. Please migrate to: https://open-api-docs.guesty.com/reference/getall

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
    "/listings/{id}/custom-fields": {
      "put": {
        "tags": [
          "Listings"
        ],
        "summary": "Update listing's Custom Fields",
        "description": "Soon to be deprecated. Please migrate to: https://open-api-docs.guesty.com/reference/getall",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Listings custom fields new values",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "customFields": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "fieldId": {
                          "type": "string",
                          "example": "5f744b491af840002ca636a2"
                        },
                        "value": {
                          "type": "string",
                          "example": "Door code"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The updated object.",
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
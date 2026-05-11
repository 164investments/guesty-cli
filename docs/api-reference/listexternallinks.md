# List external links

Returns all external links for the given property (listing). Each item has id, url, and name. Use the id values for update (PUT), delete (DELETE), or reorder (PUT order). Empty array if the property has no links yet.

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
      "name": "Listing external links"
    }
  ],
  "paths": {
    "/properties-api/listing-settings/external-links/{propertyId}": {
      "get": {
        "operationId": "listExternalLinks",
        "summary": "List external links",
        "description": "Returns all external links for the given property (listing). Each item has id, url, and name. Use the id values for update (PUT), delete (DELETE), or reorder (PUT order). Empty array if the property has no links yet.",
        "tags": [
          "Listing external links"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "The property (listing) ID. A 24-character hexadecimal string.",
            "schema": {
              "example": "507f1f77bcf86cd799439011",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Array of external links in display order. Empty array [] if none exist.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string",
                        "description": "Unique id of the link. Use for update (PUT :propertyId/:linkId), delete (DELETE), or reorder (PUT :propertyId/order).",
                        "example": "507f1f77bcf86cd799439011"
                      },
                      "url": {
                        "type": "string",
                        "description": "URL of the link (with protocol).",
                        "example": "https://example.com"
                      },
                      "name": {
                        "type": "string",
                        "description": "Display name shown to users.",
                        "example": "My Website"
                      }
                    },
                    "required": [
                      "id",
                      "url",
                      "name"
                    ]
                  }
                }
              }
            }
          },
          "401": {
            "description": "Missing or invalid authentication. Account ID is required."
          },
          "403": {
            "description": "You do not have permission to perform this action on the property."
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
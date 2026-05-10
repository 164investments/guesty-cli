# Reorder external links

Sets the display order of links. Send linkIds in the order you want (first id = first link). Only the ids you send are moved to the top in that order; any other links for the property stay at the bottom unchanged. All ids must exist for this property; no duplicates. Use GET to obtain current ids.

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
    "/properties-api/listing-settings/external-links/{propertyId}/order": {
      "put": {
        "operationId": "reorderExternalLinks",
        "summary": "Reorder external links",
        "description": "Sets the display order of links. Send linkIds in the order you want (first id = first link). Only the ids you send are moved to the top in that order; any other links for the property stay at the bottom unchanged. All ids must exist for this property; no duplicates. Use GET to obtain current ids.",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "linkIds": {
                    "uniqueItems": true,
                    "description": "Link ids in the order you want them to appear. These move to the top; other links for the property stay at the bottom. All ids must exist for this property; no duplicates. Get ids from GET :propertyId.",
                    "example": [
                      "507f1f77bcf86cd799439011",
                      "507f191e810c19729de860ea"
                    ],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "linkIds"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Full list of external links for the property in the new order.",
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
          "400": {
            "description": "linkIds contains an id that does not exist for this property, or contains duplicates."
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
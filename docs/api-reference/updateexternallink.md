# Update external link

Updates URL and/or display name of one link. Include only the fields you want to change (url, name, or both). linkId is from the list (GET) or a create response.

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
    "/properties-api/listing-settings/external-links/{propertyId}/{linkId}": {
      "put": {
        "operationId": "updateExternalLink",
        "summary": "Update external link",
        "description": "Updates URL and/or display name of one link. Include only the fields you want to change (url, name, or both). linkId is from the list (GET) or a create response.",
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
          },
          {
            "name": "linkId",
            "required": true,
            "in": "path",
            "description": "ID of the external link to update or delete. Use an id from the list (GET) or from a create response. Must be 24 hexadecimal characters.",
            "schema": {
              "example": "507f191e810c19729de860ea",
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
                  "url": {
                    "type": "string",
                    "format": "uri",
                    "description": "New URL for the link. Omit to leave unchanged. Must include protocol if set.",
                    "example": "https://example.com/updated"
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 500,
                    "description": "New display name. Omit to leave unchanged. 1–500 characters if set.",
                    "example": "Updated Website"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The updated link (id, url, name).",
            "content": {
              "application/json": {
                "schema": {
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
          },
          "400": {
            "description": "Body validation failed: url must be a valid URL with protocol (e.g. https://); name 1–500 characters if provided."
          },
          "401": {
            "description": "Missing or invalid authentication. Account ID is required."
          },
          "403": {
            "description": "You do not have permission to perform this action on the property."
          },
          "404": {
            "description": "No external link exists for this property with the given link ID."
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
# Create external link

Adds a new link to the property. url must include protocol (e.g. https://). name is the label shown to users (e.g. "House manual"). The new link is appended to the end; use PUT :propertyId/order to change order.

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
      "post": {
        "operationId": "createExternalLink",
        "summary": "Create external link",
        "description": "Adds a new link to the property. url must include protocol (e.g. https://). name is the label shown to users (e.g. \"House manual\"). The new link is appended to the end; use PUT :propertyId/order to change order.",
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
                  "url": {
                    "type": "string",
                    "format": "uri",
                    "description": "Full URL opened when the user clicks the link. Must include protocol (e.g. https://).",
                    "example": "https://example.com"
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 500,
                    "description": "Label shown for the link (e.g. \"House manual\", \"Check-in guide\"). Required; 1–500 characters.",
                    "example": "My Website"
                  }
                },
                "required": [
                  "url",
                  "name"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "The created link with assigned id. Use this id for update (PUT), delete (DELETE), or reorder (PUT order).",
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
            "description": "Validation failed: url must be a valid URL with protocol; name required, 1–500 characters."
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
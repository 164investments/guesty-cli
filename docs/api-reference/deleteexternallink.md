# Delete external link

Removes one external link from the property. linkId is from the list (GET) or a create response. Returns 204 with no body. The id cannot be used afterward.

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
      "delete": {
        "operationId": "deleteExternalLink",
        "summary": "Delete external link",
        "description": "Removes one external link from the property. linkId is from the list (GET) or a create response. Returns 204 with no body. The id cannot be used afterward.",
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
        "responses": {
          "204": {
            "description": "Link deleted. Response body is empty."
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
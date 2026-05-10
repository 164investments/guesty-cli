# Get Virtual Tour URL

Retrieve the virtual tour URL for a specific property

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
      "name": "Property Media"
    }
  ],
  "paths": {
    "/properties-api/property-media/virtual-tour/{propertyId}": {
      "get": {
        "operationId": "PropertyMediaController_getVirtualTour",
        "summary": "Get Virtual Tour URL",
        "description": "Retrieve the virtual tour URL for a specific property",
        "tags": [
          "Property Media"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "The ID of the property",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Virtual tour URL retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string",
                      "example": "5b2149c9f579400024388c47"
                    },
                    "virtualTour": {
                      "type": "object",
                      "properties": {
                        "url": {
                          "type": "string",
                          "example": "https://example.com/virtual-tour"
                        },
                        "updatedAt": {
                          "type": "string",
                          "example": "2024-01-01T12:00:00Z"
                        },
                        "updatedBy": {
                          "type": "string",
                          "example": "user@example.com"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden"
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
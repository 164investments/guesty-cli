# Create Virtual Tour URL

Insert a virtual tour URL for a specific property

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
      "post": {
        "operationId": "PropertyMediaController_createVirtualTour",
        "summary": "Create Virtual Tour URL",
        "description": "Insert a virtual tour URL for a specific property",
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
                    "description": "The virtual tour URL (HTTPS only). Send empty string to remove the URL.",
                    "example": "https://example.com/virtual-tour"
                  }
                },
                "required": [
                  "url"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Virtual tour URL created successfully"
          },
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string",
                      "description": "The property ID",
                      "example": "5b2149c9f579400024388c47"
                    },
                    "virtualTour": {
                      "description": "The virtual tour information",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "url": {
                              "type": "string",
                              "description": "The virtual tour URL",
                              "example": "https://example.com/virtual-tour"
                            },
                            "updatedAt": {
                              "format": "date-time",
                              "type": "string",
                              "description": "The date and time when the virtual tour was last updated",
                              "example": "2024-01-01T12:00:00Z"
                            },
                            "updatedBy": {
                              "type": "string",
                              "description": "The email of the user who last updated the virtual tour",
                              "example": "user@example.com"
                            }
                          },
                          "required": [
                            "url"
                          ]
                        }
                      ]
                    }
                  },
                  "required": [
                    "propertyId",
                    "virtualTour"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid URL format"
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
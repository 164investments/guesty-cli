# Get a List Of All Available Amenity Groups

Get a list of all available amenity groups

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
      "name": "Amenities"
    }
  ],
  "paths": {
    "/properties-api/amenities/groups": {
      "get": {
        "operationId": "getAmenitiesGroups",
        "summary": "Get a List Of All Available Amenity Groups",
        "description": "Get a list of all available amenity groups",
        "tags": [
          "Amenities"
        ],
        "parameters": [],
        "responses": {
          "200": {
            "description": "A list of all available amenities, groups",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "description": "The name of the amenity group",
                    "example": "Accessibility"
                  },
                  "example": [
                    "Accessibility",
                    "Bathroom",
                    "Bedroom & Laundry"
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "example": "UNAUTHORIZED"
                        },
                        "message": {
                          "type": "string",
                          "example": "Unauthorized"
                        }
                      }
                    }
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
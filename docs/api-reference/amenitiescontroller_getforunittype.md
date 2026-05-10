# Retrieve Property Amenities

Retrieve a property's amenities.

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
    "/properties-api/amenities/{propertyId}": {
      "get": {
        "operationId": "AmenitiesController_getForUnitType",
        "summary": "Retrieve Property Amenities",
        "description": "Retrieve a property's amenities.",
        "tags": [
          "Amenities"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "The id of the property to retrieve a list of amenities",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the list of amenities assigned to specific property",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string"
                    },
                    "amenities": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "An array containing amenities supported by guesty and assigned to the property"
                    },
                    "otherAmenities": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "An array containing all other amenities assigned to the property after the operation"
                    }
                  },
                  "example": {
                    "propertyId": "645774fe76e5da340bf915e7",
                    "amenities": [
                      "Shampoo",
                      "Piano"
                    ],
                    "otherAmenities": [
                      "Red wine"
                    ]
                  }
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
          },
          "404": {
            "description": "Amenities not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Not Found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
                        },
                        "data": {
                          "type": "string",
                          "example": "Amenities not found"
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
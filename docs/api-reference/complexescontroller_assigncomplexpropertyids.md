# Assign propertyIds to a complex

Assign propertyIds to a specific complex based on the complexId, and returns the assigned values

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
      "name": "Complexes"
    }
  ],
  "paths": {
    "/properties-api/complexes/{id}/assign": {
      "put": {
        "operationId": "ComplexesController_assignComplexPropertyIds",
        "summary": "Assign propertyIds to a complex",
        "description": "Assign propertyIds to a specific complex based on the complexId, and returns the assigned values",
        "tags": [
          "Complexes"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The id of the complex to update",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The complex was updated successfully. If all of the property Ids exist in the complex, a 404 will be returned.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyIds": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "example": [
                    "6457751476e5da340bf915e8",
                    "6457751e76e5da340bf915e9"
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
          },
          "404": {
            "description": "Complex not found",
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
                          "example": "Could not find complex"
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
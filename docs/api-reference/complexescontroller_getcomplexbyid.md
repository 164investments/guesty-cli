# Get complex

Get a specific complex based on the complexId

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
    "/properties-api/complexes/{id}": {
      "get": {
        "operationId": "ComplexesController_getComplexById",
        "summary": "Get complex",
        "description": "Get a specific complex based on the complexId",
        "tags": [
          "Complexes"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The id of the complex to retrieve",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the requested complex.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    },
                    "nickname": {
                      "type": "string"
                    },
                    "propertyIds": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "tags": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "example": {
                    "id": "645774fe76e5da340bf915e7",
                    "title": "Complex 1",
                    "nickname": "C1",
                    "propertyIds": [
                      "6457751476e5da340bf915e8",
                      "6457751e76e5da340bf915e9"
                    ],
                    "tags": [
                      "tag1",
                      "tag2"
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
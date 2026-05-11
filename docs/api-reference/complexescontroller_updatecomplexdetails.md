# Update complex details

Updates the details of a specific complex based on the complexId, and returns the modified values

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
      "put": {
        "operationId": "ComplexesController_updateComplexDetails",
        "summary": "Update complex details",
        "description": "Updates the details of a specific complex based on the complexId, and returns the modified values",
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
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string",
                    "description": "The title of the Complex",
                    "example": "My Title"
                  },
                  "nickname": {
                    "type": "string",
                    "description": "The nickname of the Complex. Useful in searches",
                    "example": "My Nickname"
                  },
                  "tags": {
                    "description": "An array containing Tags for this Complex",
                    "example": [
                      "Tag 1",
                      "Tag 2"
                    ],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The complex was updated successfully",
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
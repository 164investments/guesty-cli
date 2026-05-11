# Create a new complex

Create a new complex and return the ID of the newly created complex

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
    "/properties-api/complexes": {
      "post": {
        "operationId": "addComplex",
        "summary": "Create a new complex",
        "description": "Create a new complex and return the ID of the newly created complex",
        "tags": [
          "Complexes"
        ],
        "parameters": [],
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
                  "propertyIds": {
                    "description": "An array that contains Ids for propertyIds that belong to this Complex. Could be an empty array [] (default)",
                    "example": [
                      "63baba9c5c25ccae5595832b",
                      "63babaab5c25ccae5595832c"
                    ],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
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
                },
                "required": [
                  "title",
                  "nickname"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "The ID of the newly created complex",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "example": "645788211c405b56beaf26c0"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
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
                          "example": "Bad Request"
                        },
                        "status": {
                          "type": "integer",
                          "example": 422
                        },
                        "data": {
                          "type": "string",
                          "example": "Title and Nickname must not be empty"
                        }
                      }
                    }
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
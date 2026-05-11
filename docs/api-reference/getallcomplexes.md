# Get a list of all complexes

Get a list of all complexes, including their IDs, titles, nicknames, propertyIds, and tags

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
      "get": {
        "operationId": "getAllComplexes",
        "summary": "Get a list of all complexes",
        "description": "Get a list of all complexes, including their IDs, titles, nicknames, propertyIds, and tags",
        "tags": [
          "Complexes"
        ],
        "parameters": [],
        "responses": {
          "200": {
            "description": "A list of all complexes",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string",
                        "description": "The ID of the complex",
                        "example": "645774fe76e5da340bf915e7"
                      },
                      "title": {
                        "type": "string",
                        "description": "The title of the complex",
                        "example": "Complex 1"
                      },
                      "nickname": {
                        "type": "string",
                        "description": "The nickname of the complex",
                        "example": "C1"
                      },
                      "propertyIds": {
                        "type": "array",
                        "description": "An array of IDs of the properties in the complex",
                        "items": {
                          "type": "string",
                          "example": "6457751476e5da340bf915e8"
                        }
                      },
                      "tags": {
                        "type": "array",
                        "description": "An array of tags associated with the complex",
                        "items": {
                          "type": "string",
                          "example": "tag1"
                        }
                      }
                    }
                  },
                  "example": [
                    {
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
                    },
                    {
                      "id": "6457752b76e5da340bf915ea",
                      "title": "Complex 2",
                      "nickname": "C2",
                      "propertyIds": [],
                      "tags": [
                        "tag3",
                        "tag4"
                      ]
                    }
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
            "description": "No Complexs were found",
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
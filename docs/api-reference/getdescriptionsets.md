# [Beta] Get a list of description sets.

Retrieve a list of description sets for a specific Listing.

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
      "name": "Marketing fields"
    }
  ],
  "paths": {
    "/marketing/description-sets/{listingId}": {
      "get": {
        "operationId": "getDescriptionSets",
        "summary": "[Beta] Get a list of description sets.",
        "description": "Retrieve a list of description sets for a specific Listing.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [
          {
            "name": "listingId",
            "required": true,
            "in": "path",
            "description": "The listing ID whose description sets you wish to retrieve.",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the list of Description Sets.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "descriptionSets": {
                      "example": [
                        {
                          "id": "5b2149c9f579400024388c47",
                          "name": "Description set",
                          "accountId": "671f8884bc6442b95773a753",
                          "listingId": "671f888069d831bf43f3586b",
                          "channels": [
                            "airbnb2"
                          ]
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "example": "5b2149c9f579400024388c47"
                          },
                          "name": {
                            "type": "string",
                            "example": "Description set"
                          },
                          "accountId": {
                            "type": "string",
                            "example": "671f8884bc6442b95773a753"
                          },
                          "listingId": {
                            "type": "string",
                            "example": "671f888069d831bf43f3586b"
                          },
                          "channels": {
                            "example": [
                              "airbnb2"
                            ],
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          }
                        },
                        "required": [
                          "id",
                          "name",
                          "accountId",
                          "listingId",
                          "channels"
                        ]
                      }
                    }
                  },
                  "required": [
                    "descriptionSets"
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request.",
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
            "description": "Not Found",
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
                          "example": "Not Found"
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
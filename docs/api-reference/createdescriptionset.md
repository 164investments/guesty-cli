# [Beta] Create Description Set.

Create a new Description Set.

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
    "/marketing/description-sets": {
      "post": {
        "operationId": "createDescriptionSet",
        "summary": "[Beta] Create Description Set.",
        "description": "Create a new Description Set.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Name of the Description Set.",
                    "example": "Airbnb descriptions"
                  },
                  "listingId": {
                    "type": "string",
                    "description": "The id of the Listing.",
                    "example": "63bad7d05c25ccae5595832d"
                  },
                  "channels": {
                    "description": "An array containing channels for this Description Set.",
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
                  "listingId",
                  "channels"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Description Set created.",
            "content": {
              "application/json": {
                "schema": {
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
            }
          },
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
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
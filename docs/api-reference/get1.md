# Retrieve a Room Photo by ID

Get a room photo mapping for a photo, including photo id, space id and photo URL

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
      "name": "Room Photos"
    }
  ],
  "paths": {
    "/properties-api/room-photos/photos/{photoId}": {
      "get": {
        "operationId": "get1",
        "summary": "Retrieve a Room Photo by ID",
        "description": "Get a room photo mapping for a photo, including photo id, space id and photo URL",
        "tags": [
          "Room Photos"
        ],
        "parameters": [
          {
            "name": "photoId",
            "required": true,
            "in": "path",
            "description": "The id of the photo to set spaceId to",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get room photo mapping for a specific photo, including photo ID, space ID, and photo URL.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string"
                    },
                    "accountId": {
                      "type": "string"
                    },
                    "spaceId": {
                      "type": "string"
                    },
                    "photoId": {
                      "type": "string"
                    },
                    "photoUrl": {
                      "type": "string"
                    }
                  },
                  "example": {
                    "_id": "5d9e9f4a6d5b2e0017b6d5b2",
                    "spaceId": "545774fe76e5da340bf915e8",
                    "photoUrl": "https://image.com",
                    "photoId": "145774fe76e5da340bf915e2",
                    "accountId": "345774fe76e5da340bf915e3"
                  }
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
            "description": "Photo not found.",
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
                          "example": "Photo not found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
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
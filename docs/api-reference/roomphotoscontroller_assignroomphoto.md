# Assign a Photo to a Space

Assigns the selected photo to a space.

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
    "/properties-api/room-photos/photos/{photoId}/assign": {
      "put": {
        "operationId": "RoomPhotosController_assignRoomPhoto",
        "summary": "Assign a Photo to a Space",
        "description": "Assigns the selected photo to a space.",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "spaceId": {
                    "type": "string",
                    "description": "Space Id to assign room photo to"
                  },
                  "propertyId": {
                    "type": "string",
                    "description": "The Guesty ID of the property to which the room photo should be assigned."
                  }
                },
                "required": [
                  "spaceId",
                  "propertyId"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Returns a list of all property room photo mappings, including photo ID, space ID and photo URL.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string"
                    },
                    "roomPhotos": {
                      "type": "array",
                      "items": {
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
                        }
                      },
                      "description": "An array containing a list of all property room photo mappings, including photo ID, space ID and photo URL."
                    }
                  },
                  "example": {
                    "propertyId": "645774fe76e5da340bf915e7",
                    "roomPhotos": [
                      {
                        "_id": "5d9e9f4a6d5b2e0017b6d5b2",
                        "spaceId": "545774fe76e5da340bf915e8",
                        "photoUrl": "https://image.com",
                        "photoId": "145774fe76e5da340bf915e2",
                        "accountId": "345774fe76e5da340bf915e3"
                      }
                    ]
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
            "description": "Property not found.",
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
                          "example": "Property not found"
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
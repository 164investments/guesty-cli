# Change the photo order on a property

Alter the order of the existing property photos. All listed photos will be placed first, and the rest will be placed at the end.

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
      "name": "Property Photos"
    }
  ],
  "paths": {
    "/properties-api/property-photos/property-photos/{propertyId}/order": {
      "post": {
        "operationId": "order",
        "summary": "Change the photo order on a property",
        "description": "Alter the order of the existing property photos. All listed photos will be placed first, and the rest will be placed at the end.",
        "tags": [
          "Property Photos"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "Guesty property ID.",
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
                  "order": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "description": "Id of photo"
                    },
                    "description": "Array of photo IDs in the desired order",
                    "example": [
                      "66a8a31bfcaf78299543d409",
                      "66a9f1b9fcaf7829950c9e53"
                    ]
                  }
                },
                "required": [
                  "order"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Returns a list of all the property's photos.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "_id": {
                        "type": "string"
                      },
                      "source": {
                        "type": "string"
                      },
                      "original": {
                        "type": "string",
                        "description": "Full size property photo"
                      },
                      "thumbnail": {
                        "type": "string",
                        "description": "Thumbnail of property photo"
                      },
                      "caption": {
                        "type": "string",
                        "description": "Caption of photo"
                      },
                      "index": {
                        "type": "number",
                        "description": "Order of photo"
                      },
                      "createdAt": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "updatedAt": {
                        "type": "string",
                        "format": "date-time"
                      }
                    },
                    "description": "An array containing a list of all property photos, including ID, caption and URLs."
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
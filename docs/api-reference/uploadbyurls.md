# Add new photos to property

Upload new property photos using URLs. Ensure the repositories are accessible to Guesty.

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
    "/properties-api/property-photos/property-photos/{propertyId}": {
      "post": {
        "operationId": "uploadByUrls",
        "summary": "Add new photos to property",
        "description": "Upload new property photos using URLs. Ensure the repositories are accessible to Guesty.",
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
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "url": {
                      "type": "string",
                      "format": "uri",
                      "example": "https://example.com/image.jpg"
                    },
                    "caption": {
                      "type": "string",
                      "example": "Patio"
                    }
                  }
                },
                "required": [
                  "url"
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
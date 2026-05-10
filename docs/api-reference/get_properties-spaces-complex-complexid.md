# Retrieve spaces for a complex

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
      "name": "Spaces"
    }
  ],
  "paths": {
    "/properties/spaces/complex/{complexId}": {
      "get": {
        "tags": [
          "Spaces"
        ],
        "summary": "Retrieve spaces for a complex",
        "parameters": [
          {
            "name": "complexId",
            "in": "path",
            "description": "ID of the requested complexId",
            "required": true,
            "style": "simple",
            "explode": false,
            "schema": {
              "type": "string"
            },
            "example": "5d6e7a7ebf8e3800207735bf"
          }
        ],
        "responses": {
          "200": {
            "description": "Returns spaces for a requested Complex",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "complexId": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ae"
                    },
                    "unitTypeSpaces": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "unitTypeId": {
                            "type": "string",
                            "example": "5d6e7a7ebf8e3800207735ae"
                          },
                          "spaces": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "unitTypeId": {
                                  "type": "string",
                                  "example": "5d6e7a7ebf8e3800207735ae"
                                },
                                "accountId": {
                                  "type": "string",
                                  "example": "5d6e7a7ebf8e3800207735ae"
                                },
                                "name": {
                                  "type": "string",
                                  "example": "Space room"
                                },
                                "roomIds": {
                                  "type": "object",
                                  "properties": {
                                    "airbnb": {
                                      "type": "string"
                                    }
                                  }
                                },
                                "beds": {
                                  "type": "object",
                                  "properties": {
                                    "KING_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "QUEEN_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "DOUBLE_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "SINGLE_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "SOFA_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "AIR_MATTRESS": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "BUNK_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    }
                                  }
                                },
                                "other": {
                                  "type": "object",
                                  "properties": {
                                    "FLOOR_MATTRESS": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "WATER_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "TODDLER_BED": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    },
                                    "CRIB": {
                                      "minimum": 0,
                                      "type": "number",
                                      "example": 1,
                                      "default": 0
                                    }
                                  }
                                }
                              }
                            }
                          },
                          "bedroomsAllowed": {
                            "type": "boolean",
                            "example": true
                          },
                          "bathrooms": {
                            "type": "object",
                            "properties": {
                              "SHARED": {
                                "type": "number",
                                "example": 1
                              },
                              "PRIVATE": {
                                "type": "number",
                                "example": 1
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
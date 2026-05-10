# Create a new group

Create a combo property or property variant (duplicates) to organize related listings with a designated primary listing. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).

Check out our [Help Center](https://help.guesty.com/hc/en-gb/articles/33014581967901-Pilot-Managing-combo-properties-and-property-variants) to learn more about these property types.

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
      "name": "Groups [Pilot]"
    }
  ],
  "paths": {
    "/properties-api/groups/group": {
      "post": {
        "operationId": "createGroup",
        "summary": "Create a new group",
        "description": "Create a combo property or property variant (duplicates) to organize related listings with a designated primary listing. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).\n\nCheck out our [Help Center](https://help.guesty.com/hc/en-gb/articles/33014581967901-Pilot-Managing-combo-properties-and-property-variants) to learn more about these property types.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "type": {
                    "enum": [
                      "COMBO",
                      "DUPLICATES"
                    ],
                    "type": "string",
                    "description": "Type of the group",
                    "example": "COMBO"
                  },
                  "primary": {
                    "type": "string",
                    "description": "Primary listing ID",
                    "example": "63baba9c5c25ccae5595832b"
                  },
                  "members": {
                    "minItems": 1,
                    "description": "Array of listing IDs to be added to the group",
                    "example": [
                      "63baba9c5c25ccae5595832b",
                      "63babaab5c25ccae5595832c"
                    ],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "type",
                  "primary",
                  "members"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Group was successfully created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "groupId": {
                      "type": "string",
                      "example": "63baba9c5c25ccae55958321"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "COMBO",
                        "DUPLICATES"
                      ],
                      "example": "COMBO"
                    },
                    "primary": {
                      "type": "string",
                      "example": "63baba9c5c25ccae5595832b"
                    },
                    "members": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "example": [
                        "63baba9c5c25ccae5595832b",
                        "63babaab5c25ccae5595832c"
                      ]
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request data or business rule violation",
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
                          "example": "Group size exceeds maximum allowed size"
                        },
                        "code": {
                          "type": "string",
                          "example": "BAD_REQUEST"
                        },
                        "status": {
                          "type": "integer",
                          "example": 400
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Insufficient permissions",
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
                          "example": "FORBIDDEN"
                        },
                        "message": {
                          "type": "string",
                          "example": "Insufficient permissions"
                        },
                        "status": {
                          "type": "integer",
                          "example": 403
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "tags": [
          "Groups [Pilot]"
        ]
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
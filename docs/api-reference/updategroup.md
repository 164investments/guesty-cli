# Update group

Modify a combo property or property variant (group) by adding or removing members, or changing the primary listing. Provide the complete list of members after the update. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).

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
    "/properties-api/groups/group/{id}": {
      "patch": {
        "operationId": "updateGroup",
        "summary": "Update group",
        "description": "Modify a combo property or property variant (group) by adding or removing members, or changing the primary listing. Provide the complete list of members after the update. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).\n\nCheck out our [Help Center](https://help.guesty.com/hc/en-gb/articles/33014581967901-Pilot-Managing-combo-properties-and-property-variants) to learn more about these property types.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The ID of the group",
            "schema": {
              "type": "string",
              "example": "63baba9c5c25ccae55958321"
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
                  "primary": {
                    "type": "string",
                    "description": "Primary listing ID (optional - only required when changing primary)",
                    "example": "63baba9c5c25ccae5595832b"
                  },
                  "members": {
                    "description": "Array of listing IDs representing all members after update",
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
                  "members"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Group was successfully updated",
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
          },
          "404": {
            "description": "Group not found",
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
                          "example": "Group not found"
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
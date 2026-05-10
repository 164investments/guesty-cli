# List groups

Retrieve a paginated list of combo properties and property variants (groups) for the account. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants). Supports optional filtering by group type.

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
      "get": {
        "operationId": "listGroups",
        "summary": "List groups",
        "description": "Retrieve a paginated list of combo properties and property variants (groups) for the account. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants). Supports optional filtering by group type.\n\nCheck out our [Help Center](https://help.guesty.com/hc/en-gb/articles/33014581967901-Pilot-Managing-combo-properties-and-property-variants) to learn more about these property types.",
        "parameters": [
          {
            "name": "type",
            "required": false,
            "in": "query",
            "description": "Optional filter by group type",
            "schema": {
              "type": "string",
              "enum": [
                "COMBO",
                "DUPLICATES"
              ],
              "example": "COMBO"
            }
          },
          {
            "name": "offset",
            "required": false,
            "in": "query",
            "description": "Pagination offset",
            "schema": {
              "type": "integer",
              "minimum": 0,
              "example": 0,
              "default": 0
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Pagination limit (1-200)",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 200,
              "example": 50,
              "default": 50
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of groups retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "offset": {
                      "type": "number",
                      "example": 0
                    },
                    "limit": {
                      "type": "number",
                      "example": 50
                    },
                    "hasNextPage": {
                      "type": "boolean",
                      "example": false
                    },
                    "groups": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
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
                          "primaryId": {
                            "type": "string",
                            "example": "63baba9c5c25ccae5595832b"
                          },
                          "createdAt": {
                            "type": "string",
                            "format": "date-time",
                            "example": "2024-01-01T12:00:00.000Z"
                          },
                          "updatedAt": {
                            "type": "string",
                            "format": "date-time",
                            "example": "2024-01-02T12:00:00.000Z"
                          }
                        }
                      }
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
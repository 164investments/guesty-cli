# Delete group

Delete a combo property or property variant (group) and disassociate all its members. All associated Smart Calendar Rules will be removed. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).

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
      "delete": {
        "operationId": "deleteGroup",
        "summary": "Delete group",
        "description": "Delete a combo property or property variant (group) and disassociate all its members. All associated Smart Calendar Rules will be removed. The term group refers to both types: COMBO (combo properties) and DUPLICATES (property variants).\n\nCheck out our [Help Center](https://help.guesty.com/hc/en-gb/articles/33014581967901-Pilot-Managing-combo-properties-and-property-variants) to learn more about these property types.",
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
        "responses": {
          "204": {
            "description": "Group was successfully deleted"
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
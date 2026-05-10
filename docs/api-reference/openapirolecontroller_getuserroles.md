# Get assigned roles

Returns the list of roles currently assigned to the specified user.

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
      "name": "Roles"
    }
  ],
  "paths": {
    "/roles/{id}": {
      "get": {
        "operationId": "OpenApiRoleController_getUserRoles",
        "summary": "Get assigned roles",
        "description": "Returns the list of roles currently assigned to the specified user.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The unique identifier of the user whose roles are being retrieved.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "number",
                        "description": "Role id"
                      },
                      "name": {
                        "type": "string",
                        "description": "Role name"
                      },
                      "description": {
                        "type": "string",
                        "maxLength": 140,
                        "description": "Role description"
                      },
                      "updatedAt": {
                        "format": "date-time",
                        "type": "string",
                        "description": "Role update at"
                      },
                      "icon": {
                        "type": "number",
                        "description": "Role icon key"
                      }
                    },
                    "required": [
                      "id",
                      "name",
                      "description"
                    ]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request — invalid user ID"
          }
        },
        "tags": [
          "Roles"
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
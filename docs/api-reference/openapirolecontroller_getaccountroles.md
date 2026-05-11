# Get available roles

Returns the list of all roles available for assignment within the account.

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
    "/roles": {
      "get": {
        "operationId": "OpenApiRoleController_getAccountRoles",
        "summary": "Get available roles",
        "description": "Returns the list of all roles available for assignment within the account.",
        "parameters": [],
        "responses": {
          "200": {
            "description": "Success response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "roles": {
                      "description": "List of the roles",
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
              }
            }
          },
          "500": {
            "description": "Internal server error"
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
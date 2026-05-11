# Assign roles

Assigns the specified roles to a user. This will replace any existing role assignments for the user.

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
    "/roles/assign": {
      "post": {
        "operationId": "OpenApiRoleController_assignRolesToUser",
        "summary": "Assign roles",
        "description": "Assigns the specified roles to a user. This will replace any existing role assignments for the user.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": {
                    "type": "string"
                  },
                  "roles": {
                    "type": "array",
                    "items": {
                      "type": "number"
                    }
                  }
                },
                "required": [
                  "userId",
                  "roles"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Roles successfully assigned"
          },
          "201": {
            "description": ""
          },
          "400": {
            "description": "Bad request — invalid user ID or role IDs"
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
# Get scope

Returns the current scope of permitted properties assigned to the specified user.

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
      "name": "User scope"
    }
  ],
  "paths": {
    "/user-scope/{id}": {
      "get": {
        "operationId": "OpenApiUserScopeController_getScope",
        "summary": "Get scope",
        "description": "Returns the current scope of permitted properties assigned to the specified user.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The unique identifier of the user whose scope is being retrieved.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Scope retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "allAssigned": {
                      "type": "boolean",
                      "description": "True if the user is scoped to all listings in the account. When true, listingIds will not be present."
                    },
                    "listingIds": {
                      "description": "Array of listing IDs that the user is scoped to. Only present when allAssigned is false or undefined. Note: Either allAssigned or listingIds will always be present.",
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
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
          "User scope"
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
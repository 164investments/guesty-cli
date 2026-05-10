# Assign scope

Assigns a scope of permitted properties to a user. Replaces any existing scope. Use `assignAll: true` to grant access to all properties, or provide specific `listingIds`.

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
    "/user-scope/assign": {
      "post": {
        "operationId": "OpenApiUserScopeController_assignScope",
        "summary": "Assign scope",
        "description": "Assigns a scope of permitted properties to a user. Replaces any existing scope. Use `assignAll: true` to grant access to all properties, or provide specific `listingIds`.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": {
                    "type": "string",
                    "description": "User ID"
                  },
                  "assignAll": {
                    "type": "boolean",
                    "description": "Assign all properties to this user. If used, do not provide listingIds.",
                    "default": false
                  },
                  "listingIds": {
                    "description": "Array of specific listing IDs to assign (replaces existing assignments).",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "userId"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Assignment completed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "allAssigned": {
                      "type": "boolean",
                      "description": "True if all listings in the account are assigned to this user. When true, assignedListingIds will not be present."
                    },
                    "assignedListingIds": {
                      "description": "Array of listing IDs that were successfully assigned. Only present when allAssigned is false or undefined. Note: Either allAssigned or assignedListingIds will always be present.",
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
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "allAssigned": {
                      "type": "boolean",
                      "description": "True if all listings in the account are assigned to this user. When true, assignedListingIds will not be present."
                    },
                    "assignedListingIds": {
                      "description": "Array of listing IDs that were successfully assigned. Only present when allAssigned is false or undefined. Note: Either allAssigned or assignedListingIds will always be present.",
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
            "description": "Bad request — invalid user ID or listing IDs"
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
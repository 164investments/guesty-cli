# Delete a contact

Permanently deletes a contact from the phonebook.

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
      "name": "Phone Book Entries"
    }
  ],
  "paths": {
    "/contacts/{contactId}": {
      "delete": {
        "operationId": "OpenApiContactsController_remove",
        "summary": "Delete a contact",
        "description": "Permanently deletes a contact from the phonebook.",
        "parameters": [
          {
            "name": "contactId",
            "required": true,
            "in": "path",
            "description": "The ID of the contact to delete.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Contact deleted successfully.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "description": "Status of the delete operation",
                      "example": "ok"
                    }
                  },
                  "required": [
                    "status"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized."
          },
          "403": {
            "description": "Forbidden."
          },
          "404": {
            "description": "Contact not found."
          }
        },
        "tags": [
          "Phone Book Entries"
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
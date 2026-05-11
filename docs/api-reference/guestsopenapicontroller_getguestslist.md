# Get guests list

Get guests list

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
      "name": "Guests"
    }
  ],
  "paths": {
    "/guests-crud": {
      "get": {
        "operationId": "GuestsOpenApiController_getGuestsList",
        "summary": "Get guests list",
        "tags": [
          "Guests"
        ],
        "description": "Get guests list",
        "parameters": [
          {
            "name": "columns",
            "required": true,
            "in": "query",
            "example": "fullName guestEmail guestPhone address id",
            "description": "Selection of columns, separated by space",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "filters",
            "required": false,
            "in": "query",
            "example": "{\"allergies\":{\"@in\":[\"feather\"]}}",
            "description": "Object of filters to query by",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Limit guests results",
            "schema": {
              "minimum": 0,
              "default": 25,
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Pagination skip",
            "schema": {
              "minimum": 0,
              "default": 0,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The guests list has been successfully pulled.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "type": "object"
                    },
                    "total": {
                      "type": "number",
                      "minimum": 0
                    }
                  },
                  "required": [
                    "results",
                    "total"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Can not pull guests list, unauthorized"
          }
        }
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
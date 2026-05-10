# Delete saved reply by id

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
      "name": "Saved Replies"
    }
  ],
  "paths": {
    "/saved-replies/{replyId}": {
      "delete": {
        "tags": [
          "Saved Replies"
        ],
        "summary": "Delete saved reply by id",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "replyId",
            "in": "path",
            "schema": {
              "type": "string"
            },
            "required": true,
            "description": "Saved Reply Id",
            "example": "61642b0c8eb305002d9014a8"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string",
                  "example": "ok"
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string",
                  "example": "Canned response not found"
                }
              }
            }
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
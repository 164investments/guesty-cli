# Delete tax

Delete tax by id.

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
      "name": "Taxes"
    }
  ],
  "paths": {
    "/taxes/{id}": {
      "delete": {
        "operationId": "OpenApiTaxesController_deleteTax",
        "summary": "Delete tax",
        "description": "Delete tax by id.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The tax id",
            "schema": {
              "example": "df7hf01cnduhdb2125854dj8",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The tax has been successfully deleted."
          },
          "400": {
            "description": "The input provided is invalid."
          }
        },
        "tags": [
          "Taxes"
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
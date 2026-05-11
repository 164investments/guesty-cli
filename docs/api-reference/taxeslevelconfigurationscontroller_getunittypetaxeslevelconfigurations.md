# Get tax level configuration

Get tax level configuration

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
    "/taxes/level-configurations/unit-type/{id}": {
      "get": {
        "operationId": "TaxesLevelConfigurationsController_getUnitTypeTaxesLevelConfigurations",
        "summary": "Get tax level configuration",
        "description": "Get tax level configuration",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The unit type id",
            "schema": {
              "example": "df7hf01cnduhdb2125854dj8",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The taxes level configuration of the given unitTypeId.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "unitTypeId": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "accountId": {
                      "type": "string",
                      "example": "623892d57f4f56afcb25587c"
                    },
                    "levelEntityType": {
                      "type": "string",
                      "enum": [
                        "ACCOUNT",
                        "UNIT_TYPE"
                      ]
                    }
                  },
                  "required": [
                    "unitTypeId",
                    "accountId",
                    "levelEntityType"
                  ]
                }
              }
            }
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
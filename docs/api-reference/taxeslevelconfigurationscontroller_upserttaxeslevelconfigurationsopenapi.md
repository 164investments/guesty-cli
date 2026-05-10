# Create or update tax level configuration

Use to define on which level the taxes are defined for a specific unit type.

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
    "/taxes/level-configurations": {
      "put": {
        "operationId": "TaxesLevelConfigurationsController_upsertTaxesLevelConfigurationsOpenApi",
        "summary": "Create or update tax level configuration",
        "description": "Use to define on which level the taxes are defined for a specific unit type.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "unitTypeId": {
                    "type": "string",
                    "description": "1. The unit (listing) id",
                    "example": "df7hf01cnduhdb2125854dj8"
                  },
                  "levelEntityType": {
                    "type": "string",
                    "enum": [
                      "ACCOUNT",
                      "UNIT_TYPE"
                    ],
                    "description": "Sets from what entity will the taxes for reservations made on the unitType will be taken from"
                  }
                },
                "required": [
                  "unitTypeId",
                  "levelEntityType"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The taxes level configuration has been successfully updated or created.",
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
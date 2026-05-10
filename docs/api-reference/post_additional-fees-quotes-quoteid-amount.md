# Calculate additional fee amount for quote [Beta]

Calculate additional fee amount for quote [Beta]

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
      "name": "AdditionalFees"
    }
  ],
  "paths": {
    "/additional-fees/quotes/{quoteId}/amount": {
      "post": {
        "tags": [
          "AdditionalFees"
        ],
        "summary": "Calculate additional fee amount for quote [Beta]",
        "description": "Calculate additional fee amount for quote [Beta]",
        "parameters": [
          {
            "in": "path",
            "name": "quoteId",
            "description": "Quote id",
            "required": true,
            "example": "6697817a90212b000e24375a",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Request payload",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "ids": {
                    "type": "array",
                    "description": "Additional fee ids",
                    "items": {
                      "type": "string",
                      "description": "Additional fee id"
                    }
                  }
                },
                "required": [
                  "ids"
                ]
              },
              "example": {
                "ids": [
                  "668cf62e6a3556000dfc3aa5",
                  "668cf65f6a3556000dfc3aa6"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Computed amounts for every additional fee ids",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string",
                        "description": "Additional fee id"
                      },
                      "amount": {
                        "type": "number",
                        "description": "Additional fee amount"
                      }
                    }
                  }
                },
                "examples": {
                  "Computed amounts for every additional fee ids": {
                    "description": "Computed amounts for every additional fee ids",
                    "value": {
                      "amounts": [
                        {
                          "id": "668cf62e6a3556000dfc3aa5",
                          "amount": 22.35
                        },
                        {
                          "id": "668cf65f6a3556000dfc3aa6",
                          "amount": 25
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "404": {
            "description": "Not found"
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
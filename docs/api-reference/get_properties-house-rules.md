# List house rules

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
      "name": "House Rules"
    }
  ],
  "paths": {
    "/properties/house-rules/": {
      "get": {
        "tags": [
          "House Rules"
        ],
        "summary": "List house rules",
        "parameters": [
          {
            "name": "propertyIds",
            "in": "query",
            "description": "IDs of the requested unitTypes",
            "required": true,
            "style": "form",
            "explode": false,
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "House rules fields of unitTypes",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "suitableForChildren": {
                        "type": "boolean"
                      },
                      "suitableForInfants": {
                        "type": "boolean"
                      },
                      "petsAllowed": {
                        "type": "boolean"
                      },
                      "petsCharged": {
                        "type": "boolean"
                      },
                      "smokingAllowed": {
                        "type": "boolean"
                      },
                      "partiesAllowed": {
                        "type": "boolean"
                      },
                      "additionalRules": {
                        "type": "string"
                      },
                      "quietHours": {
                        "type": "object",
                        "properties": {
                          "set": {
                            "type": "boolean"
                          },
                          "start": {
                            "type": "string"
                          },
                          "end": {
                            "type": "string"
                          }
                        }
                      },
                      "minimumAge": {
                        "type": "integer"
                      }
                    },
                    "example": {
                      "suitableForChildren": true,
                      "suitableForInfants": false,
                      "petsAllowed": true,
                      "petsCharged": true,
                      "smokingAllowed": false,
                      "partiesAllowed": false,
                      "additionalRules": "No alcohol",
                      "quietHours": {
                        "set": true,
                        "start": "22:00",
                        "end": "08:00"
                      },
                      "minimumAge": 21
                    }
                  }
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
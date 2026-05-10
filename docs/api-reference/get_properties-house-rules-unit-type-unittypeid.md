# Retrieve unit-type house-rules

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
    "/properties/house-rules/unit-type/{unitTypeId}": {
      "get": {
        "tags": [
          "House Rules"
        ],
        "summary": "Retrieve unit-type house-rules",
        "parameters": [
          {
            "name": "unitTypeId",
            "in": "path",
            "description": "ID of the requested unitType",
            "required": true,
            "style": "simple",
            "explode": false,
            "schema": {
              "type": "string"
            },
            "example": "5accf6954c5ed10025902aed"
          }
        ],
        "responses": {
          "200": {
            "description": "House rules fields of unitType",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
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
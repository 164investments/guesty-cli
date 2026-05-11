# Update unit-type house-rules

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
      "put": {
        "tags": [
          "House Rules"
        ],
        "summary": "Update unit-type house-rules",
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
        "requestBody": {
          "description": "The object of house rules that needs to be updated",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "additionalRules": {
                    "type": "string"
                  },
                  "childrenRules": {
                    "type": "object",
                    "properties": {
                      "suitableForChildren": {
                        "type": "boolean"
                      },
                      "suitableForInfants": {
                        "type": "boolean"
                      },
                      "reason": {
                        "type": "string"
                      }
                    }
                  },
                  "petsAllowed": {
                    "type": "object",
                    "properties": {
                      "enabled": {
                        "type": "boolean"
                      },
                      "chargeType": {
                        "type": "string"
                      }
                    }
                  },
                  "quietBetween": {
                    "type": "object",
                    "properties": {
                      "enabled": {
                        "type": "boolean"
                      },
                      "hours": {
                        "type": "object",
                        "properties": {
                          "start": {
                            "type": "string"
                          },
                          "end": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "smokingAllowed": {
                    "type": "object",
                    "properties": {
                      "enabled": {
                        "type": "boolean"
                      }
                    }
                  },
                  "suitableForEvents": {
                    "type": "object",
                    "properties": {
                      "enabled": {
                        "type": "boolean"
                      }
                    }
                  },
                  "minimumAge": {
                    "type": "integer"
                  }
                },
                "example": {
                  "childrenRules": {
                    "suitableForChildren": true,
                    "suitableForInfants": true,
                    "reason": "Children rules reason"
                  },
                  "petsAllowed": {
                    "enabled": true,
                    "chargeType": "Credit"
                  },
                  "smokingAllowed": {
                    "enabled": false
                  },
                  "suitableForEvents": {
                    "enabled": false
                  },
                  "additionalRules": "No alcohol",
                  "quietBetween": {
                    "enabled": true,
                    "hours": {
                      "start": "22:00",
                      "end": "08:00"
                    }
                  },
                  "minimumAge": 21
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "When successfully updated"
          },
          "500": {
            "description": "TBA"
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
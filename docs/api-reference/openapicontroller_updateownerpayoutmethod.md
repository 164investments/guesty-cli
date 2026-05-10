# Update owner payout method

Updates the payout method for the given owner.

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
      "name": "Payouts"
    }
  ],
  "paths": {
    "/payouts/owners/{ownerId}": {
      "put": {
        "operationId": "OpenApiController_updateOwnerPayoutMethod",
        "summary": "Update owner payout method",
        "description": "Updates the payout method for the given owner.",
        "parameters": [
          {
            "name": "ownerId",
            "required": true,
            "in": "path",
            "description": "Owner identifier.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "type": {
                    "type": "string"
                  },
                  "accountHolderName": {
                    "type": "string"
                  },
                  "accountHolderType": {
                    "type": "string"
                  },
                  "bankName": {
                    "type": "string"
                  },
                  "accountNumber": {
                    "type": "string"
                  },
                  "routingNumber": {
                    "type": "string"
                  },
                  "accountType": {
                    "type": "string"
                  },
                  "IBAN": {
                    "type": "string"
                  },
                  "code": {
                    "type": "string"
                  },
                  "abaRoutingNumber": {
                    "type": "string"
                  },
                  "bsbCode": {
                    "type": "string"
                  },
                  "address": {
                    "type": "object",
                    "properties": {
                      "street": {
                        "type": "string"
                      },
                      "country": {
                        "type": "string"
                      },
                      "city": {
                        "type": "string"
                      },
                      "stateProvince": {
                        "type": "string"
                      },
                      "zipCode": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "street",
                      "country",
                      "city",
                      "stateProvince",
                      "zipCode"
                    ]
                  },
                  "sortCode": {
                    "type": "string"
                  }
                },
                "required": [
                  "type",
                  "accountHolderName",
                  "bankName",
                  "accountNumber",
                  "accountType",
                  "IBAN",
                  "code"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Owner payout method updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "type": {
                      "type": "string"
                    },
                    "ownerId": {
                      "type": "string"
                    },
                    "accountHolderName": {
                      "type": "string"
                    },
                    "accountHolderType": {
                      "type": "string"
                    },
                    "bankName": {
                      "type": "string"
                    },
                    "accountNumber": {
                      "type": "string"
                    },
                    "routingNumber": {
                      "type": "string"
                    },
                    "accountType": {
                      "type": "string"
                    },
                    "IBAN": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    },
                    "bsbCode": {
                      "type": "string"
                    },
                    "sortCode": {
                      "type": "string"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "updatedAt": {
                      "format": "date-time",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "ownerId",
                    "accountHolderName",
                    "accountHolderType",
                    "bankName",
                    "accountNumber",
                    "routingNumber",
                    "accountType",
                    "IBAN",
                    "code",
                    "bsbCode",
                    "sortCode",
                    "createdAt",
                    "updatedAt"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "404": {
            "description": "Payout method not found"
          }
        },
        "tags": [
          "Payouts"
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
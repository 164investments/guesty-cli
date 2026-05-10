# Get owner payout method

Returns the payout method configured for the given owner.

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
      "get": {
        "operationId": "OpenApiController_getOwnerPayoutMethods",
        "summary": "Get owner payout method",
        "description": "Returns the payout method configured for the given owner.",
        "parameters": [
          {
            "name": "ownerId",
            "required": true,
            "in": "path",
            "description": "Owner identifier to fetch payout method for.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Owner payout method",
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
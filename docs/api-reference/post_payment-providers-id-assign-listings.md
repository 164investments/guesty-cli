# Assign listings to Stripe account

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
      "name": "Payment providers"
    }
  ],
  "paths": {
    "/payment-providers/{id}/assign-listings": {
      "post": {
        "tags": [
          "Payment providers"
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Stripe payment provider"
          }
        ],
        "summary": "Assign listings to Stripe account",
        "requestBody": {
          "description": "Array of listing Ids to assign",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "listingIds": {
                    "type": "array",
                    "description": "An array of listing IDs to assign, with a maximum limit of 100 listings at a time",
                    "items": {
                      "type": "string",
                      "example": "5df48488228c7b0073a5e0b9"
                    }
                  }
                },
                "required": [
                  "listingIds"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Payment provider with listings assigned",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "syncedAt": {
                      "type": "string",
                      "format": "date"
                    },
                    "lastPendingPaymentDate": {
                      "type": "string",
                      "format": "date"
                    },
                    "listings": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "pendingPaymentsCount": {
                      "type": "number"
                    },
                    "paymentMethodsCount": {
                      "type": "number"
                    },
                    "providerAccountId": {
                      "type": "string"
                    },
                    "isDefault": {
                      "type": "boolean"
                    },
                    "providerType": {
                      "type": "string"
                    },
                    "connectedBy": {
                      "type": "string"
                    },
                    "accountName": {
                      "type": "string"
                    },
                    "defaultCurrency": {
                      "type": "string"
                    },
                    "statsLastUpdated": {
                      "type": "string",
                      "format": "date"
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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
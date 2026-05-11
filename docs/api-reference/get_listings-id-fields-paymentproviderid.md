# Retrieve a listing's paymentProviderId

 providerAccountId is important! - this is how you identify with Stripe once the clearing payment

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
      "name": "Listings"
    }
  ],
  "paths": {
    "/listings/{id}?fields=paymentProviderId": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "Retrieve a listing's paymentProviderId",
        "description": " providerAccountId is important! - this is how you identify with Stripe once the clearing payment",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Listing ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "fields",
            "description": "Listings fields to retrieve",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Listings PaymentProviderId",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "paymentProviderId": {
                      "type": "string"
                    },
                    "paymentProvider": {
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
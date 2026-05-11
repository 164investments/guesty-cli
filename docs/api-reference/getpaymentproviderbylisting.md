# Get payment provider by listing id

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
    "/payment-providers/provider-by-listing": {
      "get": {
        "tags": [
          "Payment providers"
        ],
        "summary": "Get payment provider by listing id",
        "operationId": "getPaymentProviderByListing",
        "parameters": [
          {
            "in": "query",
            "name": "includeInactiveProviders",
            "description": "include inactive providers in the response.",
            "schema": {
              "type": "boolean",
              "default": false
            }
          },
          {
            "in": "query",
            "name": "listingId",
            "description": "listing id",
            "schema": {
              "type": "string",
              "default": null
            },
            "required": true
          },
          {
            "in": "query",
            "name": "fields",
            "description": "Selection of fields, separated by space. When null retrieve the main properties of the object. We recommend always specifying the specific fields you'd like to receive to ensure that you get them.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Response received",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "allOf": [
                    {
                      "required": [
                        "_id"
                      ],
                      "type": "object",
                      "properties": {
                        "_id": {
                          "type": "string"
                        },
                        "accountName": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string"
                        },
                        "isDefault": {
                          "type": "boolean"
                        },
                        "listingsCount": {
                          "type": "number"
                        },
                        "paymentMethodsCount": {
                          "type": "number"
                        }
                      }
                    }
                  ],
                  "properties": {
                    "paymentProviderId": {
                      "type": "string"
                    },
                    "fallbackToDefault": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "Bearer": []
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
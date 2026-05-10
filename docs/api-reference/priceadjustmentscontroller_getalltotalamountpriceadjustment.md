# Get all total amount price adjustments for a reservation

Get all total amount price adjustments for a reservation

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
      "name": "Price Adjustments"
    }
  ],
  "paths": {
    "/price-adjustments/total-amount/{id}": {
      "get": {
        "operationId": "PriceAdjustmentsController_getAllTotalAmountPriceAdjustment",
        "summary": "Get all total amount price adjustments for a reservation",
        "description": "Get all total amount price adjustments for a reservation",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "example": "df7hf01cnduhdb2125854dj8",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "All total amount price adjustments for the reservation.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "_id": {
                        "type": "object",
                        "example": "df7hf01cnduhdb2125854dj8"
                      },
                      "reservationId": {
                        "type": "object"
                      },
                      "accountId": {
                        "type": "object"
                      },
                      "amount": {
                        "type": "number"
                      },
                      "normalType": {
                        "type": "string"
                      },
                      "secondIdentifier": {
                        "type": "string"
                      },
                      "creationMethod": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string"
                      },
                      "userName": {
                        "type": "string"
                      },
                      "description": {
                        "type": "string"
                      },
                      "createdAt": {
                        "format": "date-time",
                        "type": "string"
                      },
                      "updatedAt": {
                        "format": "date-time",
                        "type": "string"
                      },
                      "attributedAt": {
                        "format": "date-time",
                        "type": "string"
                      },
                      "adjustmentFlow": {
                        "type": "string"
                      },
                      "sourceName": {
                        "type": "string"
                      },
                      "parentInvoiceItemId": {
                        "type": "object",
                        "properties": {}
                      },
                      "realizationDatesRange": {
                        "type": "object",
                        "properties": {
                          "from": {
                            "type": "string"
                          },
                          "to": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "from",
                          "to"
                        ]
                      },
                      "stayIndex": {
                        "type": "number"
                      }
                    },
                    "required": [
                      "_id",
                      "reservationId",
                      "accountId",
                      "amount",
                      "normalType",
                      "creationMethod",
                      "type",
                      "userName",
                      "createdAt",
                      "updatedAt"
                    ]
                  }
                }
              }
            }
          }
        },
        "tags": [
          "Price Adjustments"
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
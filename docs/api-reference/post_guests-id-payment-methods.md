# Create payment method

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
      "name": "Guests"
    }
  ],
  "paths": {
    "/guests/{id}/payment-methods": {
      "post": {
        "tags": [
          "Guests"
        ],
        "summary": "Create payment method",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Guest ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Payment method parameters. <br> If there's auto-payments with payment method CASH (no payment method defined in the UI), then they will be changed to the added payment method automatically.",
          "content": {
            "application/json": {
              "schema": {
                "oneOf": [
                  {
                    "type": "object",
                    "description": "Create payment method with Stripe token from tokenization process.",
                    "properties": {
                      "stripeCardToken": {
                        "type": "string",
                        "description": "ID from Stripe payment method",
                        "example": "pm_..."
                      },
                      "skipSetupIntent": {
                        "type": "boolean",
                        "description": "TRUE if credit card was collected with setup_intent performed on the frontend",
                        "default": false,
                        "example": false
                      },
                      "paymentProviderId": {
                        "type": "string",
                        "description": "The payment processing account Id used in the tokenization process",
                        "default": null,
                        "example": "5fe4b21675087f01a3c5ab5b"
                      },
                      "reservationId": {
                        "type": "string",
                        "description": "Reservation ID",
                        "example": "563e0b6a08a2710e00057b82"
                      },
                      "reuse": {
                        "type": "boolean",
                        "description": "Allow this payment method for reusage in other guest's reservations",
                        "example": false,
                        "default": false
                      }
                    },
                    "required": [
                      "stripeCardToken",
                      "paymentProviderId"
                    ]
                  },
                  {
                    "description": "Create payment method using the _id received from Guesty's [credit card tokenization process](https://open-api-docs.guesty.com/docs/tokenizing-payment-methods)",
                    "type": "object",
                    "properties": {
                      "_id": {
                        "type": "string",
                        "description": "_id from tokenization process response",
                        "example": "6265d1b6a08a2710e00057b82"
                      },
                      "paymentProviderId": {
                        "type": "string",
                        "description": "The payment processing account Id used in the tokenization process",
                        "default": null,
                        "example": "5fe4b21675087f01a3c5ab5b"
                      },
                      "reservationId": {
                        "type": "string",
                        "description": "Reservation ID",
                        "example": "563e0b6a08a2710e00057b82"
                      },
                      "reuse": {
                        "type": "boolean",
                        "description": "Allow this payment method for reusage in other guest's reservations",
                        "example": false,
                        "default": false
                      }
                    },
                    "required": [
                      "_id",
                      "paymentProviderId"
                    ]
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Payment method created"
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
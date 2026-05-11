# Update or cancel a payment for reservation

Use this request to update or cancel an upcoming payment. To cancel, set the the payment status to `CANCELLED`.

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
      "name": "Reservations"
    }
  ],
  "paths": {
    "/reservations/{id}/payments/{paymentId}": {
      "put": {
        "tags": [
          "Reservations"
        ],
        "summary": "Update or cancel a payment for reservation",
        "description": "Use this request to update or cancel an upcoming payment. To cancel, set the the payment status to `CANCELLED`.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Reservation ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "path",
            "name": "paymentId",
            "description": "Payment ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Payment parameters",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": {
                    "type": "string",
                    "description": "Payment status",
                    "enum": [
                      "PENDING",
                      "PENDING_AUTH",
                      "FAILED",
                      "SUCCEEDED",
                      "CANCELLED",
                      "AUTHORIZATION_HOLD_SUCCEEDED",
                      "FAILED_FULLY_PAID",
                      "PENDING_ACTIVATION"
                    ],
                    "example": "SUCCEEDED"
                  },
                  "paymentMethod": {
                    "type": "object",
                    "description": "Payment method object\n **\"Recorded\" cash payment method example**",
                    "properties": {
                      "method": {
                        "type": "string",
                        "enum": [
                          "CASH",
                          "STRIPE",
                          "AMARYLLIS",
                          "CREDIT",
                          "DEBIT",
                          "ECHECK",
                          "AIRBNB",
                          "BANK_TRANSFER",
                          "CREDIT_NOTE",
                          "VOUCHER",
                          "CHECK",
                          "OTHER"
                        ],
                        "example": "CASH"
                      },
                      "saveForFutureUse": {
                        "type": "boolean"
                      },
                      "id": {
                        "type": "string",
                        "example": "5fa02fa358d2db673e17bc2d"
                      }
                    },
                    "required": [
                      "method"
                    ]
                  },
                  "amount": {
                    "type": "number",
                    "example": 10
                  },
                  "shouldBePaidAt": {
                    "type": "string",
                    "format": "date",
                    "description": "Expected charge date. \n Not passing this param at all or passing it with a past date, will immediately charge the payment.",
                    "example": "2023-05-30T12:00:00.000Z"
                  },
                  "paidAt": {
                    "type": "string",
                    "format": "date",
                    "description": "Used when adding a record to payment history - the actual charge date.",
                    "example": "2023-05-30T12:00:00.000Z"
                  },
                  "note": {
                    "type": "string",
                    "example": "Free text"
                  },
                  "stripePaymentMethodToken": {
                    "type": "string",
                    "description": "Stripe pm_ token representing a credit card\n **tok_ kind of tokens are NOT supported**",
                    "example": "pm_stipetoken"
                  }
                },
                "required": [
                  "paymentId",
                  "paymentMethod"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Retrieve the updated reservation payments",
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
          },
          "400": {
            "description": "Invalid Input",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Method is required"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string"
                        },
                        "message": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "required": [
                    "error"
                  ],
                  "example": {
                    "error": {
                      "code": "UNAUTHORIZED",
                      "message": "Unauthorized"
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Forbidden"
                }
              }
            }
          },
          "404": {
            "description": "Not Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Reservation Not Found"
                }
              }
            }
          },
          "500": {
            "description": "Unhandled exception. Something went wrong on server.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Internal Server Error"
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
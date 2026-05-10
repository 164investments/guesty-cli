# Add a payment to reservation

Use this request to create an immediate or future payment, and to add a record to payment history. 

An immediate or future payment is charged using a credit card, where a rerocded payment indicates the funds were collected in other methods such as bank transfer, cash, e-check etc

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
    "/reservations/{id}/payments": {
      "post": {
        "tags": [
          "Reservations"
        ],
        "summary": "Add a payment to reservation",
        "description": "Use this request to create an immediate or future payment, and to add a record to payment history. \n\nAn immediate or future payment is charged using a credit card, where a rerocded payment indicates the funds were collected in other methods such as bank transfer, cash, e-check etc",
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
          }
        ],
        "requestBody": {
          "description": "Payment parameters",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "paymentMethod": {
                    "type": "object",
                    "properties": {
                      "method": {
                        "type": "string",
                        "enum": [
                          "CASH",
                          "CREDIT",
                          "DEBIT",
                          "ECHECK",
                          "AIRBNB",
                          "BANK_TRANSFER",
                          "CREDIT_NOTE",
                          "VOUCHER",
                          "CHECK",
                          "STRIPE",
                          "AMARYLLIS",
                          "OTHER"
                        ],
                        "example": "CASH"
                      },
                      "saveForFutureUse": {
                        "type": "boolean"
                      },
                      "id": {
                        "type": "string",
                        "example": "5fa02fa358d2db673e17bc2d",
                        "description": "Required only for payments processed using credit cards (i.e not cash, echeck etc). \n Please see 'List guest's payment methods' request for more info."
                      }
                    },
                    "required": [
                      "method, id"
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
                    "description": "Free text"
                  },
                  "isAuthorizationHold": {
                    "type": "boolean",
                    "example": false,
                    "description": "True in case of Authorization hold kind of payments"
                  }
                },
                "required": [
                  "paymentMethod",
                  "amount"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Retrieve the created payment for reservation",
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
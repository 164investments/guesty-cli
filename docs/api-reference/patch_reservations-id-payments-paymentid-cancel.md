# Cancels a pending or recorded payment

Use this endpoint to cancel a pending or recorded payment

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
    "/reservations/{id}/payments/{paymentId}/cancel": {
      "patch": {
        "tags": [
          "Reservations"
        ],
        "summary": "Cancels a pending or recorded payment",
        "description": "Use this endpoint to cancel a pending or recorded payment",
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
        "responses": {
          "201": {
            "description": "Retrieve the updated reservation payments",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "description": "Payment status",
                      "example": "CANCELLED"
                    },
                    "paymentMethod": {
                      "type": "object",
                      "description": "Payment method object\n **\"Recorded\" cash payment method example**",
                      "properties": {
                        "method": {
                          "type": "string",
                          "enum": [
                            "RECORDED_CASH",
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
                          "example": "RECORDED_CASH"
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
                    "cancelledAt": {
                      "type": "string",
                      "format": "date",
                      "description": "Date of cancellation",
                      "example": "2023-05-30T12:00:00.000Z"
                    },
                    "note": {
                      "type": "string",
                      "example": "Free text"
                    }
                  },
                  "required": [
                    "paymentId"
                  ]
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
                  "example": "Payment not found"
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
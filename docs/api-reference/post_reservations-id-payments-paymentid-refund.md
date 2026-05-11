# Refund an existing payment

Use this endpoint to refund a guest's payment charged on an existing reservation.

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
    "/reservations/{id}/payments/{paymentId}/refund": {
      "post": {
        "tags": [
          "Reservations"
        ],
        "summary": "Refund an existing payment",
        "description": "Use this endpoint to refund a guest's payment charged on an existing reservation.",
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
                  "amount": {
                    "type": "number",
                    "example": 100
                  },
                  "note": {
                    "type": "string",
                    "example": "Free text"
                  }
                },
                "required": [
                  "amount"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
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
# Get transactions from Guesty Pay providers


      The endpoint retrieves transaction data from Guesty Pay providers
      The endpoint supports filtering by:
        - date range (startDate and endDate)
        - reservation confirmation code
        - subAccountId
      However, you can not use the reservationConfirmationCode filter together with other filters.

      The date range filter is mandatory if you do not use the reservationConfirmationCode filter.
      

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
      "name": "Payment Transactions"
    }
  ],
  "paths": {
    "/payment-transactions/reports": {
      "get": {
        "operationId": "ReportController_getTransactionReport",
        "summary": "Get transactions from Guesty Pay providers",
        "tags": [
          "Payment Transactions"
        ],
        "description": "\n      The endpoint retrieves transaction data from Guesty Pay providers\n      The endpoint supports filtering by:\n        - date range (startDate and endDate)\n        - reservation confirmation code\n        - subAccountId\n      However, you can not use the reservationConfirmationCode filter together with other filters.\n\n      The date range filter is mandatory if you do not use the reservationConfirmationCode filter.\n      ",
        "parameters": [
          {
            "name": "startDate",
            "required": false,
            "in": "query",
            "description": "Start date filter.",
            "schema": {
              "example": "2025-01-01",
              "type": "string"
            }
          },
          {
            "name": "endDate",
            "required": false,
            "in": "query",
            "description": "End date filter.",
            "schema": {
              "example": "2025-01-31",
              "type": "string"
            }
          },
          {
            "name": "subAccountId",
            "required": false,
            "in": "query",
            "description": "Return data for a specific sub account. The format should be accountId.subAccountId.",
            "schema": {
              "example": "1234.1",
              "type": "string"
            }
          },
          {
            "name": "reservationConfirmationCode",
            "required": false,
            "in": "query",
            "description": "Reservation confirmation code. This filter cannot be used together with other filters.",
            "schema": {
              "example": "GY-Yqjs4JT2",
              "type": "string"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Entries to skip.",
            "schema": {
              "minimum": 0,
              "default": 0,
              "example": 0,
              "type": "number"
            }
          },
          {
            "name": "take",
            "required": false,
            "in": "query",
            "description": "Entries to take.",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 25,
              "example": 25,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The list of transactions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "transactionId": {
                        "type": "string",
                        "description": "Unique identifier for this transaction from the payment processor."
                      },
                      "reservationConfirmationCode": {
                        "type": "string",
                        "description": "Guesty reservation confirmation code."
                      },
                      "amount": {
                        "type": "string",
                        "description": "Transaction amount in decimal format."
                      },
                      "currency": {
                        "type": "string",
                        "description": "ISO currency code of the transaction."
                      },
                      "last4": {
                        "type": "string",
                        "description": "Last four digits of the card used in the transaction."
                      },
                      "merchantDate": {
                        "type": "string",
                        "description": "Transaction processing date and time by the merchant."
                      },
                      "bin": {
                        "type": "string",
                        "description": "Bank identification number (BIN) of the card."
                      },
                      "subAccount": {
                        "type": "string",
                        "description": "Payment processor account identifier - merchant account name."
                      },
                      "systemDate": {
                        "type": "string",
                        "description": "Transaction processing date and time."
                      },
                      "settlementDate": {
                        "type": "string",
                        "description": "Transaction settlement date and time."
                      },
                      "paymentMethod": {
                        "type": "string",
                        "description": "Payment method type/brand."
                      },
                      "processorARN": {
                        "type": "string",
                        "description": "Acquirer reference number returned by the processor."
                      },
                      "dynamicDescriptor": {
                        "type": "string",
                        "description": "Dynamic descriptor sent to the processor."
                      },
                      "status": {
                        "type": "string",
                        "description": "Transaction status."
                      },
                      "transactionType": {
                        "type": "string",
                        "description": "Type of the transaction."
                      },
                      "authorizationOrErrorCode": {
                        "type": "string",
                        "description": "Authorization code or error code returned by the processor."
                      }
                    },
                    "required": [
                      "transactionId",
                      "reservationConfirmationCode",
                      "amount",
                      "currency",
                      "last4",
                      "merchantDate"
                    ]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Bad Request"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "Date range or reservation confirmation code is required",
                            "Invalid date format",
                            "Date range cannot exceed 1 month",
                            "End date cannot be before start date",
                            "subAccountId must be in the format number.number",
                            "Cannot use confirmation code with date range or sub account ID"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "You need to be authenticated to access this endpoint"
          }
        }
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
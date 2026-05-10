# Get payouts reconciliation data from Guesty Pay providers


      Retrieves payouts reconciliation reports from for Guesty Pay providers.
      Supports filtering by:
        - date range (startDate and endDate)
        - payoutId
        - subAccountId
        - reservation confirmation code (mutually exclusive with all other filters)

      Date range is mandatory unless reservationConfirmationCode is provided.
    

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
    "/payment-transactions/reports/payouts-reconciliation": {
      "get": {
        "operationId": "PayoutsReconciliationController_getPayoutsReconciliation",
        "summary": "Get payouts reconciliation data from Guesty Pay providers",
        "tags": [
          "Payment Transactions"
        ],
        "description": "\n      Retrieves payouts reconciliation reports from for Guesty Pay providers.\n      Supports filtering by:\n        - date range (startDate and endDate)\n        - payoutId\n        - subAccountId\n        - reservation confirmation code (mutually exclusive with all other filters)\n\n      Date range is mandatory unless reservationConfirmationCode is provided.\n    ",
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
          },
          {
            "name": "payoutId",
            "required": false,
            "in": "query",
            "description": "Filter results by payout id.",
            "schema": {
              "example": "1999001136945796604",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of payouts reconciliation entries",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "payoutId": {
                        "type": "string",
                        "description": "Payout identifier."
                      },
                      "payoutProcessDate": {
                        "type": "string",
                        "description": "Payout processing date."
                      },
                      "payoutRejectOrReturnDate": {
                        "type": "string",
                        "description": "Payout reject or return date."
                      },
                      "payoutName": {
                        "type": "string",
                        "description": "Name of the payout."
                      },
                      "payoutDescriptor": {
                        "type": "string",
                        "description": "Descriptor associated with the payout."
                      },
                      "payoutMethod": {
                        "type": "string",
                        "description": "Payout method (e.g., ACH)."
                      },
                      "payoutAmount": {
                        "type": "string",
                        "description": "Payout amount represented as a string.",
                        "example": "100.00"
                      },
                      "payoutStatus": {
                        "type": "string",
                        "description": "Payout status."
                      },
                      "payoutAuthorizationOrErrorCode": {
                        "type": "string",
                        "description": "Authorization or error code associated with the payout."
                      },
                      "payoutProcessor": {
                        "type": "string",
                        "description": "Processor handling the payout."
                      },
                      "activityType": {
                        "type": "string",
                        "description": "Type of payout activity."
                      },
                      "settlementDate": {
                        "type": "string",
                        "description": "Settlement date for the payout."
                      },
                      "transactionId": {
                        "type": "string",
                        "description": "Related transaction identifier."
                      },
                      "merchantTransactionId": {
                        "type": "string",
                        "description": "Merchant transaction identifier associated with the payout."
                      },
                      "processorTransactionId": {
                        "type": "string",
                        "description": "Processor transaction identifier associated with the payout."
                      },
                      "transactionSystemDate": {
                        "type": "string",
                        "description": "System date of the transaction."
                      },
                      "transactionMerchantDate": {
                        "type": "string",
                        "description": "Merchant date of the transaction."
                      },
                      "transactionProcessorDate": {
                        "type": "string",
                        "description": "Processor date of the transaction."
                      },
                      "transactionType": {
                        "type": "string",
                        "description": "Transaction type."
                      },
                      "paymentType": {
                        "type": "string",
                        "description": "Transaction payment type."
                      },
                      "transactionPaymentMethod": {
                        "type": "string",
                        "description": "Payment method associated with the transaction."
                      },
                      "transactionAmount": {
                        "type": "string",
                        "description": "Transaction amount."
                      },
                      "transactionProcessor": {
                        "type": "string",
                        "description": "Transaction processor name."
                      },
                      "feeName": {
                        "type": "string",
                        "description": "Fee name."
                      },
                      "feeType": {
                        "type": "string",
                        "description": "Fee type."
                      },
                      "feeCategory": {
                        "type": "string",
                        "description": "Fee category."
                      },
                      "feeAmount": {
                        "type": "string",
                        "description": "Fee amount."
                      },
                      "feeSource": {
                        "type": "string",
                        "description": "Fee source."
                      },
                      "feeTarget": {
                        "type": "string",
                        "description": "Fee target."
                      },
                      "reserveCollectionDate": {
                        "type": "string",
                        "description": "Reserve collection date."
                      },
                      "reserveReleaseDate": {
                        "type": "string",
                        "description": "Reserve release date."
                      },
                      "reserveReleaseType": {
                        "type": "string",
                        "description": "Reserve release type."
                      },
                      "reserveReleaseAmount": {
                        "type": "string",
                        "description": "Reserve release amount."
                      },
                      "adjustmentId": {
                        "type": "string",
                        "description": "Adjustment identifier."
                      },
                      "adjustmentDate": {
                        "type": "string",
                        "description": "Adjustment date."
                      },
                      "adjustmentCategory": {
                        "type": "string",
                        "description": "Adjustment category."
                      },
                      "adjustmentType": {
                        "type": "string",
                        "description": "Adjustment type."
                      },
                      "adjustmentName": {
                        "type": "string",
                        "description": "Adjustment name."
                      },
                      "adjustmentPaymentMethod": {
                        "type": "string",
                        "description": "Adjustment payment method."
                      },
                      "adjustmentStatus": {
                        "type": "string",
                        "description": "Adjustment status."
                      },
                      "payoutValue": {
                        "type": "string",
                        "description": "Payout value."
                      },
                      "percentageLimit": {
                        "type": "string",
                        "description": "Percentage limit."
                      },
                      "percentageLimitAdjustmentValue": {
                        "type": "string",
                        "description": "Percentage limit adjustment value."
                      },
                      "amountLimit": {
                        "type": "string",
                        "description": "Amount limit."
                      },
                      "amountLimitAdjustmentValue": {
                        "type": "string",
                        "description": "Amount limit adjustment value."
                      },
                      "activeLimit": {
                        "type": "string",
                        "description": "Active limit."
                      },
                      "adjustmentAmount": {
                        "type": "string",
                        "description": "Adjustment amount."
                      },
                      "activityAmount": {
                        "type": "string",
                        "description": "Activity amount."
                      },
                      "currency": {
                        "type": "string",
                        "description": "Currency associated with the payout or transaction."
                      },
                      "subAccount": {
                        "type": "string",
                        "description": "Sub account associated with the payout or transaction."
                      },
                      "platformAccount": {
                        "type": "string",
                        "description": "Platform account associated with the payout or transaction."
                      }
                    },
                    "required": [
                      "payoutId",
                      "payoutProcessDate",
                      "payoutAmount",
                      "payoutStatus",
                      "currency",
                      "subAccount",
                      "platformAccount"
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
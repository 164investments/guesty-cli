# Update Reservation Dates

Change the check-in or check-out date and time for a specific reservation. Modifying the date will automatically trigger a financial recalculation, regardless of the `applyRecalculation` flag

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
      "name": "Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/{reservationId}/dates": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationDates",
        "summary": "Update Reservation Dates",
        "description": "Change the check-in or check-out date and time for a specific reservation. Modifying the date will automatically trigger a financial recalculation, regardless of the `applyRecalculation` flag",
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "path",
            "description": "The Guesty reservation ID",
            "schema": {
              "example": "5f92cbf10cf217478ba93561",
              "type": "string"
            }
          },
          {
            "name": "mergeAccommodationFarePriceComponents",
            "required": false,
            "in": "query",
            "description": "If set to true, Markups, ExtraPersonFee, and Discounts are hidden from both the nightly rates and invoice items—they are included within the Accommodation Fee (AF). If set to false, these components are itemized separately in the response.",
            "schema": {
              "type": "boolean"
            }
          },
          {
            "name": "",
            "required": false,
            "in": "query",
            "description": "If set to true, Markups, ExtraPersonFee, and Discounts are hidden from both the nightly rates and invoice items—they are included within the Accommodation Fee (AF). If set to false, these components are itemized separately in the response.",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "checkInDateLocalized": {
                    "type": "string",
                    "description": "The reservation check-in date, localized to the property’s timezone (YYYY-MM-DD)",
                    "example": "2024-01-01"
                  },
                  "checkOutDateLocalized": {
                    "type": "string",
                    "description": "The reservation check-out date, localized to the property’s timezone (YYYY-MM-DD)",
                    "example": "2024-01-02"
                  },
                  "plannedArrival": {
                    "type": "string",
                    "description": "Use this to specify a different check-in time (Hh:mm) from the property’s default time",
                    "example": "11:00"
                  },
                  "plannedDeparture": {
                    "type": "string",
                    "description": "Use this to specify a different check-out time (Hh:mm) from the property’s default time",
                    "example": "15:00"
                  },
                  "earlyCheckIn": {
                    "description": "Define if it should be marked as ‘early check-in’. E.g., true if defined, false if not",
                    "example": true,
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "blockDay": {
                            "type": "boolean",
                            "description": "Whether day will be blocked"
                          },
                          "addAdditionalFee": {
                            "type": "boolean",
                            "description": "Whether additional fee will be added"
                          }
                        }
                      }
                    ]
                  },
                  "lateCheckOut": {
                    "description": "Define if it should be marked as ‘late check-out‘. E.g., true if defined, false if not",
                    "example": false,
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "blockDay": {
                            "type": "boolean",
                            "description": "Whether day will be blocked"
                          },
                          "addAdditionalFee": {
                            "type": "boolean",
                            "description": "Whether additional fee will be added"
                          }
                        }
                      }
                    ]
                  },
                  "applyRecalculation": {
                    "type": "boolean",
                    "default": true,
                    "description": "Should the update trigger a financial recalculation? E.g., true or false.\nNote that altering the date will automatically apply recalculation, regardless of your choice",
                    "example": false
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reservationId": {
                      "type": "string"
                    },
                    "money": {
                      "type": "object",
                      "properties": {
                        "invoiceItems": {
                          "example": [
                            {
                              "title": "Cleaning fee",
                              "amount": 20,
                              "currency": "USD",
                              "type": "CLEANING_FEE",
                              "isLocked": true,
                              "normalType": "CF"
                            }
                          ],
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "object"
                              },
                              "amount": {
                                "type": "number"
                              },
                              "currency": {
                                "type": "string"
                              },
                              "isLocked": {
                                "type": "boolean"
                              },
                              "normalType": {
                                "type": "string"
                              },
                              "title": {
                                "type": "string"
                              },
                              "type": {
                                "type": "string"
                              },
                              "isTax": {
                                "type": "boolean"
                              },
                              "isDeducted": {
                                "type": "boolean"
                              },
                              "metadata": {
                                "type": "boolean"
                              },
                              "evaluatedPercent": {
                                "type": "number"
                              },
                              "baseAmount": {
                                "type": "number"
                              },
                              "isAutoAdditionalFee": {
                                "type": "boolean"
                              },
                              "secondIdentifier": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "amount",
                              "normalType",
                              "title",
                              "type"
                            ]
                          }
                        },
                        "_id": {
                          "type": "object",
                          "properties": {}
                        },
                        "reservationId": {
                          "type": "string"
                        },
                        "fareAccommodationAdjustment": {
                          "type": "number"
                        },
                        "fareAccommodationDiscount": {
                          "type": "number"
                        },
                        "currency": {
                          "type": "string"
                        },
                        "fareAccommodation": {
                          "type": "number"
                        },
                        "guestTotalPrice": {
                          "type": "number"
                        },
                        "fareAccommodationAdjusted": {
                          "type": "number"
                        },
                        "fareCleaning": {
                          "type": "number"
                        },
                        "hostServiceFee": {
                          "type": "number"
                        },
                        "hostServiceFeeTax": {
                          "type": "number"
                        },
                        "hostServiceFeeIncTax": {
                          "type": "number"
                        },
                        "subTotalPrice": {
                          "type": "number"
                        },
                        "hostPayout": {
                          "type": "number"
                        },
                        "hostPayoutUsd": {
                          "type": "number"
                        },
                        "totalTaxes": {
                          "type": "number"
                        },
                        "payments": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "totalRefunded": {
                          "type": "number"
                        },
                        "totalPaid": {
                          "type": "number"
                        },
                        "paymentsDue": {
                          "type": "number"
                        },
                        "balanceDue": {
                          "type": "number"
                        },
                        "isFullyPaid": {
                          "type": "boolean"
                        },
                        "settingsSnapshot": {
                          "type": "object"
                        },
                        "netIncomeFormula": {
                          "type": "string"
                        },
                        "commissionFormula": {
                          "type": "string"
                        },
                        "commissionTaxPercentage": {
                          "type": "number"
                        },
                        "ownerRevenueFormula": {
                          "type": "string"
                        },
                        "useAccountRevenueShare": {
                          "type": "boolean"
                        }
                      },
                      "required": [
                        "invoiceItems",
                        "_id",
                        "reservationId",
                        "fareAccommodationAdjustment",
                        "fareAccommodationDiscount",
                        "currency",
                        "fareAccommodation",
                        "fareAccommodationAdjusted",
                        "fareCleaning",
                        "hostServiceFee",
                        "hostServiceFeeTax",
                        "hostServiceFeeIncTax",
                        "subTotalPrice",
                        "hostPayout",
                        "hostPayoutUsd",
                        "totalTaxes",
                        "payments",
                        "totalRefunded",
                        "totalPaid",
                        "paymentsDue",
                        "balanceDue",
                        "isFullyPaid",
                        "settingsSnapshot"
                      ]
                    },
                    "creationTime": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "checkInDate": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "checkOutDate": {
                      "format": "date-time",
                      "type": "string"
                    }
                  },
                  "required": [
                    "reservationId",
                    "money",
                    "creationTime",
                    "checkInDate",
                    "checkOutDate"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "422": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "500": {
            "description": "Indicates server-side error while processing the request"
          }
        },
        "tags": [
          "Reservations Open Api [Beta]"
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
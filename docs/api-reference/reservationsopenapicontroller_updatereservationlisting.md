# Update reservation listing

Change a listing for specific reservations.

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
    "/reservations-v3/{reservationId}/relocate": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationListing",
        "summary": "Update reservation listing",
        "description": "Change a listing for specific reservations.",
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
                  "listingId": {
                    "type": "string",
                    "description": "Listing ID for the reservation",
                    "example": "5f92cbf10cf217478ba93561"
                  }
                },
                "required": [
                  "listingId"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation Listing Updated",
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
                    "listingId": {
                      "type": "string"
                    },
                    "unitId": {
                      "type": "string"
                    },
                    "unitTypeId": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "reservationId",
                    "money",
                    "listingId",
                    "unitId",
                    "unitTypeId"
                  ]
                }
              }
            }
          },
          "422": {
            "description": "Validation error failed during updating listing."
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
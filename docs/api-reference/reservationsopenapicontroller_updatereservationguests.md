# Update Reservation Guests Breakdown

Update the reservation guest count, including the guest breakdown object (adults, children, infants, pets, etc.). Financial recalculation is automatically applied

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
    "/reservations-v3/{reservationId}/guests": {
      "put": {
        "operationId": "ReservationsOpenApiController_updateReservationGuests",
        "summary": "Update Reservation Guests Breakdown",
        "description": "Update the reservation guest count, including the guest breakdown object (adults, children, infants, pets, etc.). Financial recalculation is automatically applied",
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
                  "guestsCount": {
                    "type": "number",
                    "description": "The number of guests is to be included in the reservation",
                    "example": 3
                  },
                  "numberOfGuests": {
                    "description": "Object. Contains the breakdown of the guests",
                    "example": {
                      "numberOfChildren": 1,
                      "numberOfInfants": 0,
                      "numberOfPets": 1,
                      "numberOfAdults": 2
                    },
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "numberOfChildren": {
                            "type": "number",
                            "description": "Number of children",
                            "example": 1,
                            "default": 0
                          },
                          "numberOfInfants": {
                            "type": "number",
                            "description": "Number of infants",
                            "example": 1,
                            "default": 0
                          },
                          "numberOfPets": {
                            "type": "number",
                            "description": "Number of pets",
                            "example": 1,
                            "default": 0
                          },
                          "numberOfAdults": {
                            "type": "number",
                            "description": "Number of adults",
                            "example": 1
                          }
                        },
                        "required": [
                          "numberOfAdults"
                        ]
                      }
                    ]
                  }
                },
                "required": [
                  "guestsCount"
                ]
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
                    "guestsCount": {
                      "type": "number"
                    },
                    "numberOfGuests": {
                      "type": "object",
                      "properties": {
                        "numberOfChildren": {
                          "type": "number",
                          "description": "Number of children",
                          "example": 1,
                          "default": 0
                        },
                        "numberOfInfants": {
                          "type": "number",
                          "description": "Number of infants",
                          "example": 1,
                          "default": 0
                        },
                        "numberOfPets": {
                          "type": "number",
                          "description": "Number of pets",
                          "example": 1,
                          "default": 0
                        },
                        "numberOfAdults": {
                          "type": "number",
                          "description": "Number of adults",
                          "example": 1
                        }
                      },
                      "required": [
                        "numberOfAdults"
                      ]
                    }
                  },
                  "required": [
                    "reservationId",
                    "money",
                    "guestsCount",
                    "numberOfGuests"
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
# Create a total amount price adjustments

Use to create a manual price adjustments (increase or decrease) for a reservation.

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
      "name": "Price Adjustments"
    }
  ],
  "paths": {
    "/price-adjustments/manual-total-amount": {
      "post": {
        "operationId": "PriceAdjustmentsController_createManualPriceAdjustments",
        "summary": "Create a total amount price adjustments",
        "description": "Use to create a manual price adjustments (increase or decrease) for a reservation.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reservationId": {
                    "type": "string",
                    "example": "623892d57f4f56afcb25587c"
                  },
                  "priceAdjustments": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "normalType": {
                          "type": "string",
                          "enum": [
                            "AF",
                            "AFO",
                            "ARC",
                            "LOSD",
                            "GCD",
                            "CO",
                            "PRO",
                            "CF",
                            "PCM",
                            "CM",
                            "LT",
                            "CT",
                            "TT",
                            "GST",
                            "VAT",
                            "TTH",
                            "LGT",
                            "HT",
                            "TAF",
                            "TRT",
                            "AFE",
                            "PF",
                            "CFE",
                            "RT",
                            "ST",
                            "COT",
                            "OCT",
                            "TOT",
                            "HSHAT",
                            "HST",
                            "MAT",
                            "SDC",
                            "TAX",
                            "MARF",
                            "MAR",
                            "OT",
                            "OTHER"
                          ],
                          "description": "Read more about valid enums <a href=\"https://open-api-docs.guesty.com/docs/valid-enumerations\">here</a>"
                        },
                        "secondIdentifier": {
                          "type": "string",
                          "enum": [
                            "ACTIVITIES",
                            "ADDITIONAL_BED",
                            "ADDITIONAL_CHARGE",
                            "AIR_CONDITIONING",
                            "BABY_BED",
                            "BEVERAGE",
                            "BOOKING_FEE",
                            "BREAKFAST",
                            "BUSINESS_CENTER",
                            "CAR_RENTAL",
                            "CHEF",
                            "CLEANING",
                            "CLUB_CARD",
                            "COMMISSION_CHARGE",
                            "COMMUNITY",
                            "CONCIERGE",
                            "CREDIT_CARD_PROCESSING_FEE",
                            "DAMAGE_CHARGE",
                            "DAMAGE_WAIVER",
                            "DEPOSIT",
                            "DIRECT_SERVICE",
                            "DOCK_FEE",
                            "EARLY_CHECK_IN",
                            "EARLY_CHECKOUT",
                            "ELECTRICITY",
                            "EQUIPMENT_RENTAL",
                            "FLIGHTS",
                            "FOOD",
                            "GIFT_BASKET",
                            "GOLF_CART_RENTAL",
                            "GUEST_SERVICE",
                            "GUESTY_BASIC_TRAVEL_COVERAGE",
                            "GUESTY_EXTENDED_TRAVEL_COVERAGE",
                            "GUESTY_SHIELD",
                            "HEATING",
                            "HOMEOWNERS_ASSOCIATION",
                            "HOT_TUB",
                            "HOUSEKEEPING",
                            "INSURANCE",
                            "PROPERTY_INSURANCE",
                            "INTERNET",
                            "LATE_CHECK_IN",
                            "LATE_CHECKOUT",
                            "LAUNDRY",
                            "LINENS",
                            "MANAGEMENT",
                            "MEAL",
                            "MEET_AND_GREET",
                            "MINIBAR",
                            "MISCELLANEOUS",
                            "OIL",
                            "PARKING",
                            "PAYMENT_FEE",
                            "PET",
                            "POOL",
                            "POOL_HEATING",
                            "RESERVATION_FEE",
                            "RESORT",
                            "SERVICE",
                            "SHIPPING",
                            "SPA",
                            "TOILETRIES",
                            "TOTAL_PAYOUT_BASED",
                            "TOUR",
                            "TOWELS",
                            "TRANSFER",
                            "TRANSPORTATION",
                            "UTILITY_FEE",
                            "VALET",
                            "VIP_SERVICES",
                            "WATER",
                            "WELLNESS",
                            "WIFI",
                            "WOOD",
                            "EXPEDIA_AFE"
                          ],
                          "description": "When normalType AFE (Additional Fee) is selected, secondIdentifier is required, else it's forbidden. Second identifier is the type of the additional fee"
                        },
                        "parentInvoiceItemId": {
                          "type": "string",
                          "example": "623892d57f4f56afcb25587c",
                          "description": "The id of the invoice item that this adjustment is applied to"
                        },
                        "amount": {
                          "type": "number"
                        },
                        "description": {
                          "type": "string"
                        },
                        "realizationDates": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "date": {
                                "type": "string",
                                "description": "The date in which the invoice item fee is to be realized. Provide if you want to set a single date for the realization date. Allowed only if \"from\" and \"to\" are not provided."
                              },
                              "from": {
                                "type": "string",
                                "description": "The start date of the realization date range. Provide if you want to set a range for the realization dates, If you provide the \"from\" date, you must provide the \"to\" date."
                              },
                              "to": {
                                "type": "string",
                                "description": "The end date of the realization date range. Provide if you want to set a range for the realization dates, If you provide the \"to\" date, you must provide the \"from\" date."
                              }
                            }
                          }
                        },
                        "stayIndex": {
                          "type": "number"
                        }
                      },
                      "required": [
                        "normalType",
                        "amount"
                      ]
                    }
                  }
                },
                "required": [
                  "reservationId",
                  "priceAdjustments"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "The updated reservation folio."
          }
        },
        "tags": [
          "Price Adjustments"
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
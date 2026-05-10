# Create Invoice Item

Create Invoice Item

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
      "name": "Invoice Items"
    }
  ],
  "paths": {
    "/invoice-items/reservation/{reservationId}": {
      "post": {
        "operationId": "InvoiceItemsController_createInvoiceItem",
        "summary": "Create Invoice Item",
        "description": "Create Invoice Item",
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "path",
            "description": "Reservation id to which the invoice item is related to",
            "schema": {
              "type": "string"
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
                  "title": {
                    "type": "string",
                    "description": "Title of the invoice item"
                  },
                  "amount": {
                    "type": "number",
                    "description": "Price to be charged for the invoice item"
                  },
                  "description": {
                    "type": "string",
                    "description": "Description of the invoice item"
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
                      "WOOD"
                    ],
                    "description": "When normalType AFE (Additional Fee) is selected, secondIdentifier is required, else it's forbidden. Second identifier is the type of the additional fee"
                  },
                  "normalType": {
                    "type": "string",
                    "enum": [
                      "CF",
                      "CFE",
                      "PCM",
                      "LT",
                      "CT",
                      "VAT",
                      "GST",
                      "TT",
                      "TAX",
                      "ST",
                      "COT",
                      "OCT",
                      "TOT",
                      "HSHAT",
                      "HST",
                      "MAT",
                      "AFE"
                    ],
                    "description": "Invoice item type identifier. Read more about valid enums <a href=\"https://open-api-docs.guesty.com/docs/valid-enumerations\">here</a>"
                  },
                  "realizationDates": {
                    "description": "The date in which the invoice item fee is to be realized. If not provided, the system sets a default based on the earliest available date.",
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
                  },
                  "isUpsellFee": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "title",
                  "amount",
                  "normalType"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The updated folio with the new invoice item"
          },
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Some of the request parameters are invalid"
          }
        },
        "tags": [
          "Invoice Items"
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
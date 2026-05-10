# Update account channel commission

This endpoint allows you to send Guesty an updated amount for channel commissions.
Providing an amount to an existing integration object or manual source will update its channel commission value. If the integration object or manual source do not exist, they will be added.

example for bookingCom: { bookingCom: {tax: 10, commission: {value: 5, of: ["ACCOMMODATION_FARE"]}}}


Applying your channel commission on fees & taxes is currently in beta.

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
      "name": "Channel Commission"
    }
  ],
  "paths": {
    "/channel-commission/account": {
      "put": {
        "operationId": "ChannelCommissionController_updateAccountChannelCommission",
        "summary": "Update account channel commission",
        "description": "This endpoint allows you to send Guesty an updated amount for channel commissions.\nProviding an amount to an existing integration object or manual source will update its channel commission value. If the integration object or manual source do not exist, they will be added.\n\nexample for bookingCom: { bookingCom: {tax: 10, commission: {value: 5, of: [\"ACCOMMODATION_FARE\"]}}}\n\n\nApplying your channel commission on fees & taxes is currently in beta.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "manual": {
                    "description": "Objects that will be provided in manual array will be upserted to the existing array by source. Limited to 200 items in one request.",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "commission": {
                          "description": "Set commission definition",
                          "allOf": [
                            {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "number",
                                  "minimum": 0,
                                  "maximum": 100,
                                  "description": "The percentage of channel commission to be taken",
                                  "example": 5
                                },
                                "of": {
                                  "description": "The fields which the channel commission will be applied on.\nSupported values: PAYOUT, ACCOMMODATION_FARE, CLEANING_FEE, CANCELLATION_FEE, ACTIVITIES, ADDITIONAL_BED, ADDITIONAL_CHARGE, AIR_CONDITIONING, BABY_BED, BEVERAGE, BOOKING_FEE, BREAKFAST, BUSINESS_CENTER, CAR_RENTAL, CHEF, CLEANING, CLUB_CARD, COMMISSION_CHARGE, COMMUNITY, CONCIERGE, CREDIT_CARD_PROCESSING_FEE, DAMAGE_CHARGE, DAMAGE_WAIVER, DEPOSIT, DIRECT_SERVICE, DOCK_FEE, EARLY_CHECK_IN, EARLY_CHECKOUT, ELECTRICITY, EQUIPMENT_RENTAL, FLIGHTS, FOOD, GIFT_BASKET, GOLF_CART_RENTAL, GUEST_SERVICE, GUESTY_BASIC_TRAVEL_COVERAGE, GUESTY_EXTENDED_TRAVEL_COVERAGE, GUESTY_SHIELD, HEATING, HOMEOWNERS_ASSOCIATION, HOT_TUB, HOUSEKEEPING, INSURANCE, PROPERTY_INSURANCE, INTERNET, LATE_CHECK_IN, LATE_CHECKOUT, LAUNDRY, LINENS, MANAGEMENT, MEAL, MEET_AND_GREET, MINIBAR, MISCELLANEOUS, OIL, PARKING, PAYMENT_FEE, PET, POOL, POOL_HEATING, RESERVATION_FEE, RESORT, SERVICE, SHIPPING, SPA, TOILETRIES, TOTAL_PAYOUT_BASED, TOUR, TOWELS, TRANSFER, TRANSPORTATION, UTILITY_FEE, VALET, VIP_SERVICES, WATER, WELLNESS, WIFI, WOOD, LOCAL_TAX, CITY_TAX, VAT, GOODS_AND_SERVICES_TAX, TOURISM_TAX, OTHER, STATE_TAX, COUNTY_TAX, OCCUPANCY_TAX, TRANSIENT_OCCUPANCY_TAX, HOME_SHARING_TAX, HARMONIZED_SALES_TAX, MINIMUM_ALTERNATE_TAX",
                                  "example": [
                                    "ACCOMMODATION_FARE",
                                    "CLEANING_FEE",
                                    "LOCAL_TAX",
                                    "DAMAGE_WAIVER"
                                  ],
                                  "type": "array",
                                  "items": {
                                    "type": "string"
                                  }
                                }
                              },
                              "required": [
                                "value",
                                "of"
                              ]
                            }
                          ]
                        },
                        "tax": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100,
                          "description": "The tax applied on channel commission",
                          "example": 3
                        },
                        "isPreDeduct": {
                          "type": "boolean",
                          "description": "Pre deduct the channel commission if you want Guesty to automatically add a negative Host channel fee invoice item for every reservation created by this source.",
                          "example": false
                        },
                        "source": {
                          "type": "string",
                          "description": "The name of source",
                          "example": "my source"
                        }
                      },
                      "required": [
                        "isPreDeduct",
                        "source"
                      ]
                    }
                  },
                  "rentalsUnited": {
                    "description": "Channel commission formula",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {}
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The updated account channel commission."
          },
          "400": {
            "description": "The params provided are invalid."
          }
        },
        "tags": [
          "Channel Commission"
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
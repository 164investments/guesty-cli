# Get list of additional fees for account

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
      "name": "AdditionalFees"
    }
  ],
  "paths": {
    "/additional-fees/account": {
      "get": {
        "tags": [
          "AdditionalFees"
        ],
        "summary": "Get list of additional fees for account",
        "responses": {
          "200": {
            "description": "List of additional fees configured on account level",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "_id": {
                        "type": "string"
                      },
                      "accountId": {
                        "type": "string"
                      },
                      "name": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "ADDITIONAL_BED",
                          "AIR_CONDITIONING",
                          "EARLY_CHECK_IN",
                          "LATE_CHECK_IN",
                          "BABY_BED",
                          "CLEANING",
                          "CLUB_CARD",
                          "CONCIERGE",
                          "EARLY_CHECKOUT",
                          "LATE_CHECKOUT",
                          "DEPOSIT",
                          "ELECTRICITY",
                          "FOOD",
                          "HEATING",
                          "INTERNET",
                          "LAUNDRY",
                          "LINENS",
                          "TOWELS",
                          "MANAGEMENT",
                          "OIL",
                          "PARKING",
                          "PET",
                          "POOL",
                          "POOL_HEATING",
                          "RESORT",
                          "SERVICE",
                          "TOILETRIES",
                          "TOUR",
                          "TRANSPORTATION",
                          "CAR_RENTAL",
                          "WATER",
                          "WOOD",
                          "TRANSFER",
                          "HOUSEKEEPING",
                          "INSURANCE",
                          "COMMUNITY",
                          "CREDIT_CARD_PROCESSING_FEE",
                          "DAMAGE_WAIVER",
                          "VIP_SERVICES",
                          "PAYMENT_FEE",
                          "ADDITIONAL_CHARGE",
                          "MISCELLANEOUS",
                          "SHIPPING",
                          "VALET",
                          "ACTIVITIES",
                          "FLIGHTS",
                          "GIFT_BASKET",
                          "SPA",
                          "CHEF",
                          "MEET_AND_GREET",
                          "DOCK_FEE",
                          "UTILITY_FEE",
                          "HOT_TUB",
                          "BOOKING_FEE",
                          "BREAKFAST",
                          "BEVERAGE",
                          "MEAL",
                          "WELLNESS",
                          "MINIBAR",
                          "BUSINESS_CENTER",
                          "WIFI",
                          "GUEST_SERVICE",
                          "COMMISSION_CHARGE",
                          "EQUIPMENT_RENTAL",
                          "RESERVATION_FEE",
                          "DAMAGE_CHARGE",
                          "HOMEOWNERS_ASSOCIATION",
                          "GOLF_CART_RENTAL",
                          "GUESTY_BASIC_TRAVEL_COVERAGE",
                          "GUESTY_EXTENDED_TRAVEL_COVERAGE"
                        ]
                      },
                      "value": {
                        "type": "integer"
                      },
                      "targetFee": {
                        "type": "string",
                        "enum": [
                          "PAYOUT",
                          "CLEANING_FEE",
                          "ACCOMMODATION_FARE"
                        ]
                      },
                      "automationSources": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      "automationPlatforms": {
                        "type": "array",
                        "items": {
                          "type": "string",
                          "enum": [
                            "manual",
                            "airbnb",
                            "airbnb2",
                            "rentalsUnited",
                            "bookingCom",
                            "expedia",
                            "homeAway",
                            "agoda",
                            "tripAdvisor",
                            "homeaway2",
                            "siteMinder",
                            "bookingPal"
                          ]
                        }
                      },
                      "RUSources": {
                        "type": "array",
                        "items": {
                          "type": "string",
                          "enum": [
                            "agoda",
                            "bookingCom",
                            "despegar",
                            "expedia",
                            "hostelworld",
                            "homeAway"
                          ]
                        }
                      },
                      "allSources": {
                        "type": "boolean"
                      },
                      "isDeducted": {
                        "type": "boolean"
                      },
                      "isBundled": {
                        "type": "boolean"
                      },
                      "allPlatforms": {
                        "type": "boolean"
                      },
                      "allRUSources": {
                        "type": "boolean"
                      },
                      "isAutomated": {
                        "type": "boolean"
                      },
                      "isPercentage": {
                        "type": "boolean"
                      },
                      "multiplier": {
                        "type": "string",
                        "enum": [
                          "PER_NIGHT",
                          "PER_GUEST",
                          "PER_GUEST_PER_NIGHT",
                          "PER_STAY"
                        ]
                      },
                      "isSyncToSupportedChannelsEnabled": {
                        "type": "boolean"
                      },
                      "deductedConfiguration": {
                        "description": "[Beta] Deduct the fee amount from accommodation fare once the reservation is confirmed per manual source/channel configuration",
                        "type": "object",
                        "properties": {
                          "isApplyToAll": {
                            "description": "[Beta] Deduct the fee amount from accommodation fare once the reservation is confirmed for all reservations",
                            "type": "boolean"
                          },
                          "sources": {
                            "description": "[Beta] Deduct the fee amount from accommodation fare once the reservation is confirmed for reservations from specific manual sources. Will be not counted when \"isApplyToAll\" is \"true\"",
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "channels": {
                            "description": "[Beta] Deduct the fee amount from accommodation fare once the reservation is confirmed for reservations from specific channels. Will be not counted when \"isApplyToAll\" is \"true\"",
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          }
                        }
                      },
                      "channelConfigurations": {
                        "description": "[Beta] Settings overrides per channel",
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "channel": {
                              "description": "[Beta] Channel name",
                              "type": "string"
                            },
                            "isEnabled": {
                              "description": "[Beta] Is sync to channel enabled",
                              "type": "boolean"
                            },
                            "type": {
                              "description": "[Beta] Fee Type in the channel",
                              "type": "string"
                            },
                            "value": {
                              "type": "number",
                              "description": "[Beta] 1. Must be bigger than 0,\n2. When 'isPercentage' is 'true' then must be smaller or equal to 100",
                              "minimum": 0
                            },
                            "isPercentage": {
                              "description": "[Beta] Sets whether 'value' should be a fixed amount or percentage",
                              "type": "boolean"
                            },
                            "multiplier": {
                              "description": "[Beta]\n1. Sets the factor by which the 'value' will be multiplied in the additional fee amount calculation when 'isPercentage' is 'false',\n2. Its required when 'isPercentage' is 'false'",
                              "type": "string",
                              "enum": [
                                "PER_NIGHT",
                                "PER_GUEST",
                                "PER_GUEST_PER_NIGHT",
                                "PER_STAY"
                              ]
                            },
                            "targetFee": {
                              "description": "[Beta]\n1. The fee to use for the additional fee amount calculation when 'isPercentage' is 'true',\n2. It's required when 'isPercentage' is 'true'",
                              "type": "string",
                              "enum": [
                                "PAYOUT",
                                "CLEANING_FEE",
                                "ACCOMMODATION_FARE"
                              ]
                            },
                            "isBundled": {
                              "type": "boolean",
                              "description": "[Beta] Include fee in the accommodation fare"
                            },
                            "conditions": {
                              "description": "[Beta] Conditions",
                              "type": "array",
                              "items": {
                                "oneOf": [
                                  {
                                    "description": "[Beta] Fee type exclusion condition",
                                    "type": "object",
                                    "properties": {
                                      "type": {
                                        "description": "[Beta] Condition type",
                                        "type": "string",
                                        "enum": [
                                          "feeTypeExclusion"
                                        ]
                                      },
                                      "value": {
                                        "description": "[Beta] List of fee types. When one of the fee types is present in the reservation, the additional fee will not be applied",
                                        "type": "array",
                                        "items": {
                                          "type": "string",
                                          "enum": [
                                            "ADDITIONAL_BED",
                                            "AIR_CONDITIONING",
                                            "EARLY_CHECK_IN",
                                            "LATE_CHECK_IN",
                                            "BABY_BED",
                                            "CLEANING",
                                            "CLUB_CARD",
                                            "CONCIERGE",
                                            "EARLY_CHECKOUT",
                                            "LATE_CHECKOUT",
                                            "DEPOSIT",
                                            "ELECTRICITY",
                                            "FOOD",
                                            "HEATING",
                                            "INTERNET",
                                            "LAUNDRY",
                                            "LINENS",
                                            "TOWELS",
                                            "MANAGEMENT",
                                            "OIL",
                                            "PARKING",
                                            "PET",
                                            "POOL",
                                            "POOL_HEATING",
                                            "RESORT",
                                            "SERVICE",
                                            "TOILETRIES",
                                            "TOUR",
                                            "TRANSPORTATION",
                                            "CAR_RENTAL",
                                            "WATER",
                                            "WOOD",
                                            "TRANSFER",
                                            "HOUSEKEEPING",
                                            "INSURANCE",
                                            "COMMUNITY",
                                            "CREDIT_CARD_PROCESSING_FEE",
                                            "DAMAGE_WAIVER",
                                            "VIP_SERVICES",
                                            "PAYMENT_FEE",
                                            "ADDITIONAL_CHARGE",
                                            "MISCELLANEOUS",
                                            "SHIPPING",
                                            "VALET",
                                            "ACTIVITIES",
                                            "FLIGHTS",
                                            "GIFT_BASKET",
                                            "SPA",
                                            "CHEF",
                                            "MEET_AND_GREET",
                                            "DOCK_FEE",
                                            "UTILITY_FEE",
                                            "HOT_TUB",
                                            "BOOKING_FEE",
                                            "BREAKFAST",
                                            "BEVERAGE",
                                            "MEAL",
                                            "WELLNESS",
                                            "MINIBAR",
                                            "BUSINESS_CENTER",
                                            "WIFI",
                                            "GUEST_SERVICE",
                                            "COMMISSION_CHARGE",
                                            "EQUIPMENT_RENTAL",
                                            "RESERVATION_FEE",
                                            "DAMAGE_CHARGE",
                                            "HOMEOWNERS_ASSOCIATION",
                                            "GOLF_CART_RENTAL",
                                            "GUESTY_BASIC_TRAVEL_COVERAGE",
                                            "GUESTY_EXTENDED_TRAVEL_COVERAGE"
                                          ]
                                        },
                                        "minItems": 1,
                                        "uniqueItems": true
                                      }
                                    },
                                    "required": [
                                      "type",
                                      "value"
                                    ]
                                  },
                                  {
                                    "description": "[Beta] Date range condition",
                                    "type": "object",
                                    "properties": {
                                      "type": {
                                        "description": "[Beta] Condition type",
                                        "type": "string",
                                        "enum": [
                                          "dateRange"
                                        ]
                                      },
                                      "value": {
                                        "type": "array",
                                        "minItems": 1,
                                        "items": {
                                          "type": "object",
                                          "properties": {
                                            "from": {
                                              "description": "[Beta] Date in the YYYY-MM-DD ISO 8601 format",
                                              "type": "string",
                                              "format": "date"
                                            },
                                            "to": {
                                              "description": "[Beta] Date in the YYYY-MM-DD ISO 8601. format",
                                              "type": "string",
                                              "format": "date"
                                            }
                                          },
                                          "required": [
                                            "from",
                                            "to"
                                          ]
                                        }
                                      },
                                      "overrides": {
                                        "description": "[Beta] Overrides the additional fee value when the condition is met",
                                        "type": "object",
                                        "properties": {
                                          "value": {
                                            "type": "number",
                                            "minimum": 0
                                          }
                                        },
                                        "required": [
                                          "value"
                                        ]
                                      }
                                    },
                                    "required": [
                                      "type",
                                      "value",
                                      "overrides"
                                    ]
                                  }
                                ]
                              }
                            },
                            "isOverrideConditions": {
                              "description": "[Beta] Override group/root conditions. When \"true\" will use conditions from this configuration only, otherwise will use conditions from group/root configuration. Currently, it can be used only for a Booking engine",
                              "type": "boolean",
                              "default": false
                            }
                          },
                          "required": [
                            "channel",
                            "value",
                            "isPercentage"
                          ]
                        }
                      },
                      "sourcesConfigurations": {
                        "description": "[Beta] Settings overrides per groups of manual sources",
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "sources": {
                              "type": "array",
                              "items": {
                                "description": "[Beta] List of manual sources to which the fee can be automatically applied.",
                                "type": "string"
                              },
                              "minItems": 1
                            },
                            "type": {
                              "type": "string",
                              "enum": [
                                "ADDITIONAL_BED",
                                "AIR_CONDITIONING",
                                "EARLY_CHECK_IN",
                                "LATE_CHECK_IN",
                                "BABY_BED",
                                "CLEANING",
                                "CLUB_CARD",
                                "CONCIERGE",
                                "EARLY_CHECKOUT",
                                "LATE_CHECKOUT",
                                "DEPOSIT",
                                "ELECTRICITY",
                                "FOOD",
                                "HEATING",
                                "INTERNET",
                                "LAUNDRY",
                                "LINENS",
                                "TOWELS",
                                "MANAGEMENT",
                                "OIL",
                                "PARKING",
                                "PET",
                                "POOL",
                                "POOL_HEATING",
                                "RESORT",
                                "SERVICE",
                                "TOILETRIES",
                                "TOUR",
                                "TRANSPORTATION",
                                "CAR_RENTAL",
                                "WATER",
                                "WOOD",
                                "TRANSFER",
                                "HOUSEKEEPING",
                                "INSURANCE",
                                "COMMUNITY",
                                "CREDIT_CARD_PROCESSING_FEE",
                                "DAMAGE_WAIVER",
                                "VIP_SERVICES",
                                "PAYMENT_FEE",
                                "ADDITIONAL_CHARGE",
                                "MISCELLANEOUS",
                                "SHIPPING",
                                "VALET",
                                "ACTIVITIES",
                                "FLIGHTS",
                                "GIFT_BASKET",
                                "SPA",
                                "CHEF",
                                "MEET_AND_GREET",
                                "DOCK_FEE",
                                "UTILITY_FEE",
                                "HOT_TUB",
                                "BOOKING_FEE",
                                "BREAKFAST",
                                "BEVERAGE",
                                "MEAL",
                                "WELLNESS",
                                "MINIBAR",
                                "BUSINESS_CENTER",
                                "WIFI",
                                "GUEST_SERVICE",
                                "COMMISSION_CHARGE",
                                "EQUIPMENT_RENTAL",
                                "RESERVATION_FEE",
                                "DAMAGE_CHARGE",
                                "HOMEOWNERS_ASSOCIATION",
                                "GOLF_CART_RENTAL",
                                "GUESTY_BASIC_TRAVEL_COVERAGE",
                                "GUESTY_EXTENDED_TRAVEL_COVERAGE"
                              ],
                              "description": "[Beta] Fee type"
                            },
                            "isPercentage": {
                              "description": "[Beta] Sets whether 'value' should be a fixed amount or percentage",
                              "type": "boolean"
                            },
                            "value": {
                              "type": "number",
                              "description": "[Beta]\n1. Must be bigger than 0,\n2. When 'isPercentage' is 'true' then must be smaller or equal to 100",
                              "minimum": 0
                            },
                            "multiplier": {
                              "description": "[Beta]\n1. Specifies the factor by which the 'value' will be multiplied in the additional fee amount calculation when 'isPercentage' is 'false'.\n2. This is required when 'isPercentage' is 'false'.",
                              "type": "string",
                              "enum": [
                                "PER_NIGHT",
                                "PER_GUEST",
                                "PER_GUEST_PER_NIGHT",
                                "PER_STAY"
                              ]
                            },
                            "targetFee": {
                              "description": "[Beta]\n1. The fee to use for the additional fee amount calculation when 'isPercentage' is 'true',\n2. It's required when 'isPercentage' is 'true'",
                              "type": "string",
                              "enum": [
                                "PAYOUT",
                                "CLEANING_FEE",
                                "ACCOMMODATION_FARE"
                              ]
                            },
                            "isBundled": {
                              "type": "boolean",
                              "description": "[Beta] Include fee in the accommodation fare"
                            },
                            "conditions": {
                              "description": "[Beta] Conditions",
                              "type": "array",
                              "items": {
                                "oneOf": [
                                  {
                                    "description": "[Beta] Fee type exclusion condition",
                                    "type": "object",
                                    "properties": {
                                      "type": {
                                        "description": "[Beta] Condition type",
                                        "type": "string",
                                        "enum": [
                                          "feeTypeExclusion"
                                        ]
                                      },
                                      "value": {
                                        "description": "[Beta] List of fee types. When one of the fee types is present in the reservation, the additional fee will not be applied",
                                        "type": "array",
                                        "items": {
                                          "type": "string",
                                          "enum": [
                                            "ADDITIONAL_BED",
                                            "AIR_CONDITIONING",
                                            "EARLY_CHECK_IN",
                                            "LATE_CHECK_IN",
                                            "BABY_BED",
                                            "CLEANING",
                                            "CLUB_CARD",
                                            "CONCIERGE",
                                            "EARLY_CHECKOUT",
                                            "LATE_CHECKOUT",
                                            "DEPOSIT",
                                            "ELECTRICITY",
                                            "FOOD",
                                            "HEATING",
                                            "INTERNET",
                                            "LAUNDRY",
                                            "LINENS",
                                            "TOWELS",
                                            "MANAGEMENT",
                                            "OIL",
                                            "PARKING",
                                            "PET",
                                            "POOL",
                                            "POOL_HEATING",
                                            "RESORT",
                                            "SERVICE",
                                            "TOILETRIES",
                                            "TOUR",
                                            "TRANSPORTATION",
                                            "CAR_RENTAL",
                                            "WATER",
                                            "WOOD",
                                            "TRANSFER",
                                            "HOUSEKEEPING",
                                            "INSURANCE",
                                            "COMMUNITY",
                                            "CREDIT_CARD_PROCESSING_FEE",
                                            "DAMAGE_WAIVER",
                                            "VIP_SERVICES",
                                            "PAYMENT_FEE",
                                            "ADDITIONAL_CHARGE",
                                            "MISCELLANEOUS",
                                            "SHIPPING",
                                            "VALET",
                                            "ACTIVITIES",
                                            "FLIGHTS",
                                            "GIFT_BASKET",
                                            "SPA",
                                            "CHEF",
                                            "MEET_AND_GREET",
                                            "DOCK_FEE",
                                            "UTILITY_FEE",
                                            "HOT_TUB",
                                            "BOOKING_FEE",
                                            "BREAKFAST",
                                            "BEVERAGE",
                                            "MEAL",
                                            "WELLNESS",
                                            "MINIBAR",
                                            "BUSINESS_CENTER",
                                            "WIFI",
                                            "GUEST_SERVICE",
                                            "COMMISSION_CHARGE",
                                            "EQUIPMENT_RENTAL",
                                            "RESERVATION_FEE",
                                            "DAMAGE_CHARGE",
                                            "HOMEOWNERS_ASSOCIATION",
                                            "GOLF_CART_RENTAL",
                                            "GUESTY_BASIC_TRAVEL_COVERAGE",
                                            "GUESTY_EXTENDED_TRAVEL_COVERAGE"
                                          ]
                                        },
                                        "minItems": 1,
                                        "uniqueItems": true
                                      }
                                    },
                                    "required": [
                                      "type",
                                      "value"
                                    ]
                                  },
                                  {
                                    "description": "[Beta] Date range condition",
                                    "type": "object",
                                    "properties": {
                                      "type": {
                                        "description": "[Beta] Condition type",
                                        "type": "string",
                                        "enum": [
                                          "dateRange"
                                        ]
                                      },
                                      "value": {
                                        "type": "array",
                                        "minItems": 1,
                                        "items": {
                                          "type": "object",
                                          "properties": {
                                            "from": {
                                              "description": "[Beta] Date in the YYYY-MM-DD ISO 8601 format",
                                              "type": "string",
                                              "format": "date"
                                            },
                                            "to": {
                                              "description": "[Beta] Date in the YYYY-MM-DD ISO 8601. format",
                                              "type": "string",
                                              "format": "date"
                                            }
                                          },
                                          "required": [
                                            "from",
                                            "to"
                                          ]
                                        }
                                      },
                                      "overrides": {
                                        "description": "[Beta] Overrides the additional fee value when the condition is met",
                                        "type": "object",
                                        "properties": {
                                          "value": {
                                            "type": "number",
                                            "minimum": 0
                                          }
                                        },
                                        "required": [
                                          "value"
                                        ]
                                      }
                                    },
                                    "required": [
                                      "type",
                                      "value",
                                      "overrides"
                                    ]
                                  }
                                ]
                              }
                            },
                            "isOverrideConditions": {
                              "description": "[Beta] Override group/root conditions. When \"true\" will use conditions from this configuration only, otherwise will use conditions from group/root configuration",
                              "type": "boolean",
                              "default": false
                            }
                          },
                          "required": [
                            "value",
                            "isPercentage",
                            "sources"
                          ]
                        }
                      },
                      "isUpsell": {
                        "type": "boolean",
                        "description": "[Beta] Upsell fee on the booking website"
                      },
                      "upsell": {
                        "description": "[Beta] Upsell fee on the booking website settings.",
                        "type": "object",
                        "properties": {
                          "description": {
                            "description": "[Beta] Description. It can contain links in markdown format like [My link title](https://example.com). Max length validation counts only link title.",
                            "type": "string",
                            "maxLength": 350
                          },
                          "images": {
                            "description": "[Beta] Image associated with this upsell. Currently, only one image is allowed. The default image will be used when it's not defined.",
                            "type": "array",
                            "minItems": 1,
                            "maxItems": 1,
                            "items": {
                              "type": "object",
                              "required": [
                                "url"
                              ],
                              "properties": {
                                "url": {
                                  "description": "[Beta] Image URL. URL should contain only content with image MIME type and should be less than 25MB in size.",
                                  "type": "string"
                                },
                                "fileName": {
                                  "description": "[Beta] Image file name",
                                  "type": "string"
                                }
                              }
                            }
                          }
                        }
                      },
                      "conditions": {
                        "description": "[Beta] Conditions",
                        "type": "array",
                        "items": {
                          "oneOf": [
                            {
                              "description": "[Beta] Fee type exclusion condition",
                              "type": "object",
                              "properties": {
                                "type": {
                                  "description": "[Beta] Condition type",
                                  "type": "string",
                                  "enum": [
                                    "feeTypeExclusion"
                                  ]
                                },
                                "value": {
                                  "description": "[Beta] List of fee types. When one of the fee types is present in the reservation, the additional fee will not be applied",
                                  "type": "array",
                                  "items": {
                                    "type": "string",
                                    "enum": [
                                      "ADDITIONAL_BED",
                                      "AIR_CONDITIONING",
                                      "EARLY_CHECK_IN",
                                      "LATE_CHECK_IN",
                                      "BABY_BED",
                                      "CLEANING",
                                      "CLUB_CARD",
                                      "CONCIERGE",
                                      "EARLY_CHECKOUT",
                                      "LATE_CHECKOUT",
                                      "DEPOSIT",
                                      "ELECTRICITY",
                                      "FOOD",
                                      "HEATING",
                                      "INTERNET",
                                      "LAUNDRY",
                                      "LINENS",
                                      "TOWELS",
                                      "MANAGEMENT",
                                      "OIL",
                                      "PARKING",
                                      "PET",
                                      "POOL",
                                      "POOL_HEATING",
                                      "RESORT",
                                      "SERVICE",
                                      "TOILETRIES",
                                      "TOUR",
                                      "TRANSPORTATION",
                                      "CAR_RENTAL",
                                      "WATER",
                                      "WOOD",
                                      "TRANSFER",
                                      "HOUSEKEEPING",
                                      "INSURANCE",
                                      "COMMUNITY",
                                      "CREDIT_CARD_PROCESSING_FEE",
                                      "DAMAGE_WAIVER",
                                      "VIP_SERVICES",
                                      "PAYMENT_FEE",
                                      "ADDITIONAL_CHARGE",
                                      "MISCELLANEOUS",
                                      "SHIPPING",
                                      "VALET",
                                      "ACTIVITIES",
                                      "FLIGHTS",
                                      "GIFT_BASKET",
                                      "SPA",
                                      "CHEF",
                                      "MEET_AND_GREET",
                                      "DOCK_FEE",
                                      "UTILITY_FEE",
                                      "HOT_TUB",
                                      "BOOKING_FEE",
                                      "BREAKFAST",
                                      "BEVERAGE",
                                      "MEAL",
                                      "WELLNESS",
                                      "MINIBAR",
                                      "BUSINESS_CENTER",
                                      "WIFI",
                                      "GUEST_SERVICE",
                                      "COMMISSION_CHARGE",
                                      "EQUIPMENT_RENTAL",
                                      "RESERVATION_FEE",
                                      "DAMAGE_CHARGE",
                                      "HOMEOWNERS_ASSOCIATION",
                                      "GOLF_CART_RENTAL",
                                      "GUESTY_BASIC_TRAVEL_COVERAGE",
                                      "GUESTY_EXTENDED_TRAVEL_COVERAGE"
                                    ]
                                  },
                                  "minItems": 1,
                                  "uniqueItems": true
                                }
                              },
                              "required": [
                                "type",
                                "value"
                              ]
                            },
                            {
                              "description": "[Beta] Date range condition",
                              "type": "object",
                              "properties": {
                                "type": {
                                  "description": "[Beta] Condition type",
                                  "type": "string",
                                  "enum": [
                                    "dateRange"
                                  ]
                                },
                                "value": {
                                  "type": "array",
                                  "minItems": 1,
                                  "items": {
                                    "type": "object",
                                    "properties": {
                                      "from": {
                                        "description": "[Beta] Date in the YYYY-MM-DD ISO 8601 format",
                                        "type": "string",
                                        "format": "date"
                                      },
                                      "to": {
                                        "description": "[Beta] Date in the YYYY-MM-DD ISO 8601. format",
                                        "type": "string",
                                        "format": "date"
                                      }
                                    },
                                    "required": [
                                      "from",
                                      "to"
                                    ]
                                  }
                                },
                                "overrides": {
                                  "description": "[Beta] Overrides the additional fee value when the condition is met",
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "number",
                                      "minimum": 0
                                    }
                                  },
                                  "required": [
                                    "value"
                                  ]
                                }
                              },
                              "required": [
                                "type",
                                "value",
                                "overrides"
                              ]
                            }
                          ]
                        }
                      }
                    }
                  }
                },
                "examples": {
                  "Fees list": {
                    "description": "list of additional fees",
                    "value": [
                      {
                        "_id": "5fa02fa358d2db673e17bc2d",
                        "isPercentage": false,
                        "automationSources": [],
                        "automationPlatforms": [],
                        "RUSources": [],
                        "isAutomated": false,
                        "allPlatforms": false,
                        "allRUSources": false,
                        "allSources": false,
                        "name": "AB",
                        "type": "EARLY_CHECK_IN",
                        "value": 5,
                        "accountId": "596f6fe706112710005d96ff",
                        "isSyncToSupportedChannelsEnabled": false,
                        "multiplier": "PER_GUEST",
                        "__v": 0
                      }
                    ]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
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
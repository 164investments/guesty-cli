# Create additional fee on account level

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
      "post": {
        "tags": [
          "AdditionalFees"
        ],
        "summary": "Create additional fee on account level",
        "requestBody": {
          "description": "request payload",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "description": "When configuring the platform and sources fields, user discretion should be taken to choose platforms or sources that are integrated to the account/listing",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Define an internal name for your additional fee"
                  },
                  "type": {
                    "description": "Additional fee type.\n !!! Not all additional fee types can be synced with channels. If you select the additional fee type which cannot be synced with channels, and 'isSyncToSupportedChannelsEnabled' is [true] you will receive a validation error. GUESTY_BASIC_TRAVEL_COVERAGE and GUESTY_EXTENDED_TRAVEL_COVERAGE can't be synced with channels. This fee types are relevant only to users who purchased Guesty’s Travel Insurance Product and can only be defined as an upsell for guests to purchase.",
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
                    "description": "1. Must be bigger than 0,\n2. When 'isPercentage' is 'true' then must be smaller or equal to 100",
                    "type": "integer"
                  },
                  "isPercentage": {
                    "description": "Sets wether 'value' should be a fixed amount or percentage",
                    "type": "boolean"
                  },
                  "targetFee": {
                    "description": "1. The fee to use for the additional fee amount calculation when 'isPercentage' is 'true',\n2. required when 'isPercentage' is 'true'",
                    "type": "string",
                    "enum": [
                      "PAYOUT",
                      "CLEANING_FEE",
                      "ACCOMMODATION_FARE"
                    ]
                  },
                  "multiplier": {
                    "description": "1. Specifies the factor by which the 'value' will be multiplied in the additional fee amount calculation when 'isPercentage' is 'false'. \n2. This is required when 'isPercentage' is 'false'.",
                    "type": "string",
                    "enum": [
                      "PER_NIGHT",
                      "PER_GUEST",
                      "PER_GUEST_PER_NIGHT",
                      "PER_STAY"
                    ]
                  },
                  "isSyncToSupportedChannelsEnabled": {
                    "type": "boolean",
                    "description": "1. Sync fee to account or listing settings and all future reservations for supported booking channels. \n !!! Not all additional fee types can be synced with channels. If you select the additional fee type which cannot be synced with channels, and 'isSyncToSupportedChannelsEnabled' is [true] you will receive a validation error"
                  },
                  "isAutomated": {
                    "type": "boolean",
                    "description": "1. Indicates if there are booking channels in which the additional fee should be added automatically to reservations once the reservation arrives in Guesty,\n2. if set to 'true', you must configure at least one of 'allSources', 'automationSources', 'allPlatforms', 'automationPlatforms', 'allRUSources', 'RUSources'"
                  },
                  "allPlatforms": {
                    "type": "boolean",
                    "description": "1. If 'true' then the additional fee will be added to all future reservations in Guesty for all booking channels,\n2. can not be 'true' when 'isAutomated' is 'false',\n3. can not be 'true' when 'automationPlatforms' is not empty"
                  },
                  "automationPlatforms": {
                    "type": "array",
                    "description": "1. Additional fee will be added to future reservations in Guesty for specified booking channels,\n2. can not contain values when 'isAutomated' is 'false',\n3. can not contain values when 'allPlatforms' is 'true'",
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
                  "allSources": {
                    "type": "boolean",
                    "description": "1. if 'true' then the additional fee will be added to all future reservations for all manual sources,\n2. can not be 'true' when 'isAutomated' is 'false',\n3. can not be 'true' when 'automationSources' is not empty"
                  },
                  "automationSources": {
                    "type": "array",
                    "description": "1. additional fee will be added to future reservations in Guesty for specified manual sources,\n2. can not contain values when 'isAutomated' is 'false',\n3. can not contain values when 'allSources' is 'true'",
                    "items": {
                      "type": "string"
                    }
                  },
                  "allRUSources": {
                    "type": "boolean",
                    "description": "1. If 'true' then the additional fee will be added to all future rentals united reservations in Guesty for all rentals united booking channels,\n2. can not be 'true' when 'isAutomated' is 'false'\n3. can not be 'true' when 'RUSources' is not empty,\n4. when 'true' then 'rentalsUnited' must be included in 'automationPlatforms' or 'allPlatforms' must be 'true'"
                  },
                  "RUSources": {
                    "type": "array",
                    "description": "1. Additional fee will be added to future rentals united reservations in Guesty for specified rentals united booking channels, \n2. can not contain values when 'isAutomated' is 'false',\n3. can not contain values when 'allRUSources' is 'true',\n4. when not empty then 'rentalsUnited' must be included in 'automationPlatforms' or 'allPlatforms' must be 'true'",
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
                  "isDeducted": {
                    "type": "boolean",
                    "description": "[Beta] isDeducted must be [false] without isBundled being [true] when either isSyncToSupportedChannelsEnabled, isAutomated are [true]."
                  },
                  "isBundled": {
                    "type": "boolean",
                    "description": "[Beta] Bundle as part of accommodation fare"
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
                },
                "required": [
                  "name",
                  "type",
                  "value",
                  "isPercentage"
                ]
              },
              "example": {
                "name": "AB",
                "type": "FOOD",
                "value": 5,
                "isPercentage": false,
                "multiplier": "PER_GUEST"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "created additional fee item in account level",
            "content": {
              "application/json; charset=utf-8": {
                "schema": {
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
                },
                "examples": {
                  "Created additional fee": {
                    "description": "additional fee example",
                    "value": {
                      "_id": "5fa02fa358d2db673e17bc2d",
                      "isPercentage": false,
                      "multiplier": "PER_NIGHT",
                      "automationSources": [
                        "travel agent Gabriel",
                        "source2"
                      ],
                      "automationPlatforms": [
                        "airbnb2",
                        "homeaway2"
                      ],
                      "RUSources": [],
                      "isAutomated": true,
                      "allPlatforms": false,
                      "allRUSources": false,
                      "allSources": false,
                      "name": "AB",
                      "type": "FOOD",
                      "value": 5,
                      "accountId": "596f6fe706112710005d96ff",
                      "isSyncToSupportedChannelsEnabled": false,
                      "channelConfigurations": [
                        {
                          "channel": "airbnb2",
                          "isEnabled": true,
                          "type": "Management fee",
                          "value": 10,
                          "isPercentage": false,
                          "multiplier": "PER_STAY",
                          "isBundled": false
                        },
                        {
                          "channel": "homeaway2",
                          "isEnabled": true,
                          "type": "INTERNET",
                          "value": 15,
                          "isPercentage": true,
                          "targetFee": "PAYOUT",
                          "isBundled": true
                        }
                      ],
                      "sourcesConfigurations": [
                        {
                          "sources": [
                            "travel agent Gabriel",
                            "source2"
                          ],
                          "type": "BABY_BED",
                          "value": 10,
                          "isPercentage": false,
                          "multiplier": "PER_STAY",
                          "isBundled": true,
                          "isOverrideConditions": false,
                          "conditions": []
                        }
                      ],
                      "isDeducted": true,
                      "deductedConfiguration": {
                        "isApplyToAll": false,
                        "channel": [
                          "homeaway2"
                        ],
                        "sources": [
                          "travel agent Gabriel",
                          "source2"
                        ]
                      },
                      "isUpsell": true,
                      "upsell": {
                        "description": "Baby bed for your baby",
                        "images": [
                          {
                            "fileName": "image.jpg",
                            "url": "https://assets.guesty.com/image/upload/v1723994644/production/financials/upsells/raxfb5htryx0b2qewthk.jpg"
                          }
                        ]
                      },
                      "conditions": [
                        {
                          "type": "dateRange",
                          "value": {
                            "from": "01-01",
                            "to": "01-31"
                          },
                          "overrides": {
                            "value": 10
                          }
                        },
                        {
                          "type": "dateRange",
                          "value": {
                            "from": "06-01",
                            "to": "06-30"
                          },
                          "overrides": {
                            "value": 25
                          }
                        },
                        {
                          "type": "feeTypesExclusion",
                          "value": [
                            "DAMAGE_WAIVER"
                          ]
                        }
                      ],
                      "__v": 0
                    }
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
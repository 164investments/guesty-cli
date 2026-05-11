# Update tax

Update tax by id.

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
      "name": "Taxes"
    }
  ],
  "paths": {
    "/taxes/{id}": {
      "patch": {
        "operationId": "OpenApiTaxesController_updateTax",
        "summary": "Update tax",
        "description": "Update tax by id.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The tax id",
            "schema": {
              "example": "df7hf01cnduhdb2125854dj8",
              "type": "string"
            }
          },
          {
            "name": "applyRequiredChangesToTaxesWithSameType",
            "required": false,
            "in": "query",
            "schema": {
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
                  "type": {
                    "type": "string",
                    "enum": [
                      "LOCAL_TAX",
                      "CITY_TAX",
                      "VAT",
                      "GOODS_AND_SERVICES_TAX",
                      "TOURISM_TAX",
                      "OTHER",
                      "STATE_TAX",
                      "COUNTY_TAX",
                      "OCCUPANCY_TAX",
                      "TRANSIENT_OCCUPANCY_TAX",
                      "HOME_SHARING_TAX",
                      "HARMONIZED_SALES_TAX",
                      "MINIMUM_ALTERNATE_TAX"
                    ],
                    "description": "1. The tax type.\n2. Each tax type can only be defined once on account/listing level."
                  },
                  "units": {
                    "type": "string",
                    "enum": [
                      "PERCENTAGE",
                      "FIXED"
                    ],
                    "description": "Determines whether the tax amount should be treated as a fixed or percentage value"
                  },
                  "amount": {
                    "type": "number",
                    "minimum": 0,
                    "description": "1. the amount of the tax, could be a fixed value or percentage whether units is 'FIXED' or 'PERCENTAGE' respectively.\n 2. when 'FIXED' then 'amount' has to be greater then 0\n 3. when 'PERCENTAGE' then 'amount' has to be greater then 0 and smaller or equal to 100"
                  },
                  "quantifier": {
                    "type": "string",
                    "enum": [
                      "PER_NIGHT",
                      "PER_GUEST",
                      "PER_GUEST_PER_NIGHT",
                      "PER_STAY"
                    ],
                    "description": "Determines by what factor the tax amount will be multiplied"
                  },
                  "appliedToAllFees": {
                    "type": "boolean",
                    "description": "1. Relevant only when the units equals 'PERCENTAGE'\n2. When equals 'true', then the tax will be calculated on all fees and 'appliedOnFees' must contain all values"
                  },
                  "appliedOnFees": {
                    "type": "array",
                    "example": [
                      "AF"
                    ],
                    "items": {
                      "type": "string",
                      "description": "Relevant only when units is 'PERCENTAGE'. Defines the fee types on which the tax will be calculated. Accepts standard invoice item type codes (e.g. AF for Accommodation Fare, CF for Cleaning Fee) or additional fee type identifiers (e.g. PET, CLEANING, PARKING). TOTAL_PAYOUT_BASED fee values are not allowed.",
                      "enum": [
                        "AF",
                        "AFO",
                        "AFED",
                        "ARC",
                        "LOSD",
                        "GCD",
                        "CO",
                        "PRO",
                        "CF",
                        "PCM",
                        "CM",
                        "AFE",
                        "PF",
                        "MARF",
                        "MAR",
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
                      ]
                    }
                  },
                  "isAppliedByDefault": {
                    "type": "boolean",
                    "description": "1. When set to 'true' and 'appliedByDefaultOnChannels' is not empty, then Guesty will prededuct the tax from the accommodation fare.\n 2. can not be 'true' when 'appliedByDefaultOnChannels' is empty"
                  },
                  "appliedByDefaultOnChannels": {
                    "type": "array",
                    "example": [
                      "airbnb2"
                    ],
                    "items": {
                      "type": "string",
                      "description": "When provided and isAppliedByDefault is set to true, Guesty will pre-deduct the tax from the accommodation fare for reservations from those channels. Cannot contain values when isAppliedByDefault is false. Only supported for 'airbnb2' and 'manual' channels.",
                      "enum": [
                        "manual",
                        "airbnb2"
                      ]
                    }
                  },
                  "conditionalOverrides": {
                    "description": "Set additional conditions for this tax",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "viewType": {
                            "type": "string",
                            "enum": [
                              "NIGHTS",
                              "DATES",
                              "NIGHTS_IN_DATES",
                              "LOS"
                            ],
                            "description": "1. The kind of conditions to set on the tax\n 2. When 'units' is 'FIXED' and 'quantifier' is 'guest'/'stay' then 'NiGHTS' and 'NIGHTS_IN_DATES' viewTypes are forbidden,\n 3. When 'units' is 'PERCENTAGE' then all viewTypes are allowed"
                          },
                          "rules": {
                            "description": "1. The dates and nights ranges that the tax condition will apply for.\n 2. When viewType is 'LOS' then rules is forbidden, else rules is required and can not be empty.",
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "dateRange": {
                                  "description": "1. When viewType is 'NIGHTS' then rules objects can not contain dateRanges.",
                                  "allOf": [
                                    {
                                      "type": "object",
                                      "properties": {
                                        "from": {
                                          "type": "string",
                                          "pattern": "MMDD_DATE_FORMAT_REGEX",
                                          "example": "12-31"
                                        },
                                        "to": {
                                          "type": "string",
                                          "pattern": "MMDD_DATE_FORMAT_REGEX",
                                          "example": "02-01"
                                        }
                                      },
                                      "required": [
                                        "from",
                                        "to"
                                      ]
                                    }
                                  ]
                                },
                                "nightRanges": {
                                  "description": "1. When viewType is 'DATES' then all rules objects must contain only 1 nightRange with no 'to' field and 'from' field equals 1.",
                                  "type": "array",
                                  "items": {
                                    "type": "object",
                                    "properties": {
                                      "from": {
                                        "type": "number",
                                        "minimum": 1
                                      },
                                      "to": {
                                        "type": "number",
                                        "minimum": 1
                                      },
                                      "amount": {
                                        "type": "number",
                                        "minimum": 0
                                      }
                                    },
                                    "required": [
                                      "from",
                                      "amount"
                                    ]
                                  }
                                }
                              },
                              "required": [
                                "nightRanges"
                              ]
                            }
                          },
                          "maxNightCountToApplyOn": {
                            "type": "number",
                            "minimum": 1,
                            "description": "1. The tax will be applied for all reservation that has night count smaller then 'maxNightCountToApplyOn'\n 2. Only when 'viewType' is 'LOS' then this field is allowed and required"
                          }
                        },
                        "required": [
                          "viewType"
                        ]
                      }
                    ]
                  },
                  "channelOverrides": {
                    "description": "Channel-specific overrides for this tax. Each entry customizes the tax for a specific channel.",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "channel": {
                          "type": "string",
                          "description": "The booking channel this override applies to (e.g. Airbnb, Booking.com). Each channel can only appear once per tax.",
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
                            "bookingPal",
                            "vrboLite",
                            "aabode",
                            "alohacamp",
                            "allogio",
                            "altoVita",
                            "alluraDirect",
                            "angells",
                            "anystaysCom",
                            "belVilla",
                            "bluegroundNestpick",
                            "bnbFinder",
                            "boarding",
                            "bookingPalGcm",
                            "boutiquehomeCom",
                            "byndhomesCom",
                            "bynd",
                            "cockpit",
                            "cocoonr",
                            "crewDogs",
                            "cuddlyNest",
                            "desVu",
                            "easyReserve",
                            "etravel",
                            "feratel",
                            "findRentals",
                            "floridaPanhandleCom",
                            "floridaRentals",
                            "getawayGoGo",
                            "glampingHub",
                            "golfhom",
                            "gonesto",
                            "googleVacationRentals",
                            "got2Go",
                            "groupRentals",
                            "guestSmiles",
                            "hawaiianIslandsCom",
                            "helloLanding",
                            "hiSite",
                            "holidaySwap",
                            "holidu",
                            "homesVillasByMarriott",
                            "homeToGo",
                            "hopper",
                            "hostelworld",
                            "hotelbeds",
                            "hotelsCombined",
                            "houfy",
                            "housingAnywhere",
                            "houseStay",
                            "housingPanda",
                            "HVN",
                            "hyperguest",
                            "inntopia",
                            "invenioHomes",
                            "lakeCom",
                            "livily",
                            "livjaza",
                            "luxico",
                            "luxuryEscapes",
                            "makeMyTrip",
                            "mirai",
                            "mrMrsSmith",
                            "muchosol",
                            "mysaGlobal",
                            "nesto",
                            "netAffinity",
                            "oliversTravels",
                            "onefinestay",
                            "plumGuide",
                            "priceTravelCom",
                            "rakutenStayInc",
                            "reconline",
                            "rentalEscapes",
                            "rentalz",
                            "reserva",
                            "revato",
                            "roibos",
                            "sabreSynxis",
                            "situCom",
                            "skyesCottages",
                            "smilingHouse",
                            "smokyMountainCom",
                            "soujourn",
                            "spacestCom",
                            "square",
                            "stay",
                            "stayHvn",
                            "stayLonger",
                            "stayOne",
                            "staySense",
                            "stugaCa",
                            "szallas",
                            "theDyrt",
                            "theMaimonGroup",
                            "theQuintessCollection",
                            "topVillas",
                            "torontoBoutiqueApartments",
                            "traveloka",
                            "travelStaytion",
                            "travelWithAspectCom",
                            "tripco",
                            "tripCom",
                            "trustedStays",
                            "tuiVillas",
                            "vacasa",
                            "vacationFinder",
                            "vacationRenter",
                            "vacayHome",
                            "vacayMyWay",
                            "viajesElCorteIngles",
                            "villaFinder",
                            "villaway",
                            "villaTracker",
                            "vivreStays",
                            "vrboLite",
                            "wander",
                            "weChalet",
                            "whimstay",
                            "zaaer"
                          ]
                        },
                        "isEnabled": {
                          "type": "boolean",
                          "description": "Whether this tax is active for the specified channel. When set to false, the tax will not be applied to reservations from this channel. Defaults to true if not provided."
                        },
                        "name": {
                          "type": "string",
                          "maxLength": 40,
                          "description": "A custom display name for this tax on the specified channel. If not provided, the tax's default name is used."
                        },
                        "isInclusive": {
                          "type": "boolean",
                          "description": "Whether the tax should be treated as inclusive for this channel. If not provided, the tax's default inclusive setting is used."
                        },
                        "isAppliedByDefault": {
                          "type": "boolean",
                          "description": "Whether the tax is automatically pre-deducted from the accommodation fare for this channel override. If not provided, the tax's default setting is used. Only allowed when this override's channel is 'airbnb2' or 'manual'. Must be set to true when appliedByDefaultOnChannels is provided.",
                          "example": true
                        },
                        "appliedByDefaultOnChannels": {
                          "type": "array",
                          "example": [
                            "manual"
                          ],
                          "items": {
                            "type": "string",
                            "description": "When provided and isAppliedByDefault is set to true, Guesty will pre-deduct the tax from the accommodation fare for reservations from those channels. Cannot contain values when isAppliedByDefault is false. Only supported for 'airbnb2' and 'manual' channels.",
                            "enum": [
                              "manual",
                              "airbnb2"
                            ]
                          }
                        }
                      },
                      "required": [
                        "channel"
                      ]
                    }
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 40,
                    "description": "The name for the tax, which will be used accross guesty. there can be no two taxes with the same name. to remove a name of existing tax pass empty string"
                  },
                  "isInclusive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The tax has been successfully updated.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "unitTypeId": {
                      "type": "string",
                      "example": "623892d57f4f56afcb25587c"
                    },
                    "accountId": {
                      "type": "string",
                      "example": "623892d57f4f56afcb25587c"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "LOCAL_TAX",
                        "CITY_TAX",
                        "VAT",
                        "GOODS_AND_SERVICES_TAX",
                        "TOURISM_TAX",
                        "OTHER",
                        "STATE_TAX",
                        "COUNTY_TAX",
                        "OCCUPANCY_TAX",
                        "TRANSIENT_OCCUPANCY_TAX",
                        "HOME_SHARING_TAX",
                        "HARMONIZED_SALES_TAX",
                        "MINIMUM_ALTERNATE_TAX"
                      ]
                    },
                    "units": {
                      "type": "string",
                      "enum": [
                        "PERCENTAGE",
                        "FIXED"
                      ]
                    },
                    "quantifier": {
                      "type": "string",
                      "enum": [
                        "PER_NIGHT",
                        "PER_GUEST",
                        "PER_GUEST_PER_NIGHT",
                        "PER_STAY"
                      ]
                    },
                    "appliedOnFees": {
                      "example": [
                        "AF"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "appliedByDefaultOnChannels": {
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
                          "bookingPal",
                          "vrboLite"
                        ]
                      }
                    },
                    "channelOverrides": {
                      "description": "Per-channel customizations for this tax. Each entry allows you to override specific tax settings (such as name, enabled state, or inclusive behavior) for a particular booking channel, without changing the tax's default configuration.",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "channel": {
                            "type": "string",
                            "description": "The booking channel this override applies to (e.g. Airbnb, Booking.com). Each channel can only appear once per tax.",
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
                              "bookingPal",
                              "vrboLite",
                              "aabode",
                              "alohacamp",
                              "allogio",
                              "altoVita",
                              "alluraDirect",
                              "angells",
                              "anystaysCom",
                              "belVilla",
                              "bluegroundNestpick",
                              "bnbFinder",
                              "boarding",
                              "bookingPalGcm",
                              "boutiquehomeCom",
                              "byndhomesCom",
                              "bynd",
                              "cockpit",
                              "cocoonr",
                              "crewDogs",
                              "cuddlyNest",
                              "desVu",
                              "easyReserve",
                              "etravel",
                              "feratel",
                              "findRentals",
                              "floridaPanhandleCom",
                              "floridaRentals",
                              "getawayGoGo",
                              "glampingHub",
                              "golfhom",
                              "gonesto",
                              "googleVacationRentals",
                              "got2Go",
                              "groupRentals",
                              "guestSmiles",
                              "hawaiianIslandsCom",
                              "helloLanding",
                              "hiSite",
                              "holidaySwap",
                              "holidu",
                              "homesVillasByMarriott",
                              "homeToGo",
                              "hopper",
                              "hostelworld",
                              "hotelbeds",
                              "hotelsCombined",
                              "houfy",
                              "housingAnywhere",
                              "houseStay",
                              "housingPanda",
                              "HVN",
                              "hyperguest",
                              "inntopia",
                              "invenioHomes",
                              "lakeCom",
                              "livily",
                              "livjaza",
                              "luxico",
                              "luxuryEscapes",
                              "makeMyTrip",
                              "mirai",
                              "mrMrsSmith",
                              "muchosol",
                              "mysaGlobal",
                              "nesto",
                              "netAffinity",
                              "oliversTravels",
                              "onefinestay",
                              "plumGuide",
                              "priceTravelCom",
                              "rakutenStayInc",
                              "reconline",
                              "rentalEscapes",
                              "rentalz",
                              "reserva",
                              "revato",
                              "roibos",
                              "sabreSynxis",
                              "situCom",
                              "skyesCottages",
                              "smilingHouse",
                              "smokyMountainCom",
                              "soujourn",
                              "spacestCom",
                              "square",
                              "stay",
                              "stayHvn",
                              "stayLonger",
                              "stayOne",
                              "staySense",
                              "stugaCa",
                              "szallas",
                              "theDyrt",
                              "theMaimonGroup",
                              "theQuintessCollection",
                              "topVillas",
                              "torontoBoutiqueApartments",
                              "traveloka",
                              "travelStaytion",
                              "travelWithAspectCom",
                              "tripco",
                              "tripCom",
                              "trustedStays",
                              "tuiVillas",
                              "vacasa",
                              "vacationFinder",
                              "vacationRenter",
                              "vacayHome",
                              "vacayMyWay",
                              "viajesElCorteIngles",
                              "villaFinder",
                              "villaway",
                              "villaTracker",
                              "vivreStays",
                              "vrboLite",
                              "wander",
                              "weChalet",
                              "whimstay",
                              "zaaer"
                            ]
                          },
                          "isEnabled": {
                            "type": "boolean",
                            "description": "Whether this tax is active for the specified channel. When set to false, the tax will not be applied to reservations from this channel. Defaults to true if not provided."
                          },
                          "name": {
                            "type": "string",
                            "maxLength": 40,
                            "description": "A custom display name for this tax on the specified channel. If not provided, the tax's default name is used."
                          },
                          "isInclusive": {
                            "type": "boolean",
                            "description": "Whether the tax should be treated as inclusive for this channel. If not provided, the tax's default inclusive setting is used."
                          },
                          "isAppliedByDefault": {
                            "type": "boolean",
                            "description": "Whether the tax is automatically pre-deducted from the accommodation fare for this channel override. If not provided, the tax's default setting is used. Only allowed when this override's channel is 'airbnb2' or 'manual'. Must be set to true when appliedByDefaultOnChannels is provided.",
                            "example": true
                          },
                          "appliedByDefaultOnChannels": {
                            "type": "array",
                            "example": [
                              "manual"
                            ],
                            "items": {
                              "type": "string",
                              "description": "When provided and isAppliedByDefault is set to true, Guesty will pre-deduct the tax from the accommodation fare for reservations from those channels. Cannot contain values when isAppliedByDefault is false. Only supported for 'airbnb2' and 'manual' channels.",
                              "enum": [
                                "manual",
                                "airbnb2"
                              ]
                            }
                          }
                        },
                        "required": [
                          "channel"
                        ]
                      }
                    },
                    "isDeleted": {
                      "type": "boolean"
                    },
                    "amount": {
                      "type": "number"
                    },
                    "name": {
                      "type": "string"
                    },
                    "appliedToAllFees": {
                      "type": "boolean"
                    },
                    "isAppliedByDefault": {
                      "type": "boolean"
                    },
                    "conditionalOverrides": {
                      "type": "object",
                      "properties": {
                        "viewType": {
                          "type": "string",
                          "enum": [
                            "NIGHTS",
                            "DATES",
                            "NIGHTS_IN_DATES",
                            "LOS"
                          ]
                        },
                        "rules": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "dateRange": {
                                "type": "object",
                                "properties": {
                                  "from": {
                                    "type": "string",
                                    "example": "12-31"
                                  },
                                  "to": {
                                    "type": "string",
                                    "example": "02-01"
                                  }
                                },
                                "required": [
                                  "from",
                                  "to"
                                ]
                              },
                              "nightRanges": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "from": {
                                      "type": "number",
                                      "minimum": 1
                                    },
                                    "to": {
                                      "type": "number",
                                      "minimum": 1
                                    },
                                    "amount": {
                                      "type": "number",
                                      "minimum": 0
                                    }
                                  },
                                  "required": [
                                    "from",
                                    "amount"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "nightRanges"
                            ]
                          }
                        },
                        "maxNightCountToApplyOn": {
                          "type": "number"
                        }
                      },
                      "required": [
                        "viewType"
                      ]
                    },
                    "channelConfig": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "channel": {
                            "type": "string"
                          },
                          "userConfig": {
                            "type": "object",
                            "properties": {
                              "syncSelection": {
                                "type": "string"
                              }
                            },
                            "required": [
                              "syncSelection"
                            ]
                          }
                        },
                        "required": [
                          "channel",
                          "userConfig"
                        ]
                      }
                    },
                    "isInclusive": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "accountId",
                    "type",
                    "units",
                    "quantifier",
                    "appliedOnFees",
                    "appliedByDefaultOnChannels",
                    "amount",
                    "appliedToAllFees",
                    "isAppliedByDefault"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "The input provided is invalid."
          }
        },
        "tags": [
          "Taxes"
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
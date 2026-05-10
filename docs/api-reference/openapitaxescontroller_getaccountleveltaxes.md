# Get account level taxes

Get account level taxes

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
    "/taxes/account": {
      "get": {
        "operationId": "OpenApiTaxesController_getAccountLevelTaxes",
        "summary": "Get account level taxes",
        "description": "Get account level taxes",
        "parameters": [],
        "responses": {
          "200": {
            "description": "The account level taxes.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
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
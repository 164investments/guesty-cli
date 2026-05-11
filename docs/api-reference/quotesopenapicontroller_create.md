# Create a Quote

This endpoint allows the creation of a price quote for a reservation. It requires details such as the listing ID, check-in and check-out dates, and guest count. The response includes detailed information about the quote, including rates, promotions, and applicable fees.

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
      "name": "Quotes Open Api [Beta]"
    }
  ],
  "paths": {
    "/quotes": {
      "post": {
        "operationId": "QuotesOpenApiController_create",
        "summary": "Create a Quote",
        "description": "This endpoint allows the creation of a price quote for a reservation. It requires details such as the listing ID, check-in and check-out dates, and guest count. The response includes detailed information about the quote, including rates, promotions, and applicable fees.",
        "parameters": [
          {
            "name": "mergeAccommodationFarePriceComponents",
            "required": true,
            "in": "query",
            "schema": {
              "type": "boolean"
            }
          },
          {
            "name": "includePaymentsTemplate",
            "required": false,
            "in": "query",
            "description": "Include payments template information in the response",
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
              "default": true,
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
                    "description": "Localized to listing timezone reservation check-in date (YYYY-MM-DD)",
                    "example": "2024-01-04"
                  },
                  "checkOutDateLocalized": {
                    "type": "string",
                    "description": "Localized to listing timezone reservation checkout date (YYYY-MM-DD)",
                    "example": "2024-01-05"
                  },
                  "listingId": {
                    "type": "string",
                    "description": "Guesty listing ID",
                    "example": "6213b03e7f0ba50032296f4a"
                  },
                  "source": {
                    "type": "string",
                    "description": "Define the source for getting an updated price quote",
                    "example": "manual"
                  },
                  "guestsCount": {
                    "type": "number",
                    "minimum": 1,
                    "description": "Number of guests to be included in the quote",
                    "example": 2
                  },
                  "numberOfGuests": {
                    "description": "Keeps information on the number of guests",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "numberOfChildren": {
                            "type": "number",
                            "minimum": 0,
                            "description": "Number of children in the reservation. It can be zero"
                          },
                          "numberOfInfants": {
                            "type": "number",
                            "minimum": 0,
                            "description": "Number of infants in the reservation. It can be zero"
                          },
                          "numberOfPets": {
                            "type": "number",
                            "minimum": 0,
                            "description": "Number of pets in the reservation. It can be zero"
                          },
                          "numberOfAdults": {
                            "type": "number",
                            "minimum": 1,
                            "description": "Count of adults, must be > 0"
                          }
                        }
                      }
                    ]
                  },
                  "ignoreCalendar": {
                    "type": "boolean",
                    "description": "The system will check calendar availability and decline (401) if unavailable unless this flag is set to true"
                  },
                  "ignoreTerms": {
                    "type": "boolean",
                    "description": "The system will ensure the reservation accords with the terms (min, max nights, any other terms) of the property and will decline(401) if it is. To override, set this flag to true"
                  },
                  "ignoreBlocks": {
                    "type": "boolean",
                    "description": "Set this flag to true to ignore existing flexible blocks (advance notice, preparation time, etc)"
                  },
                  "couponCode": {
                    "type": "string",
                    "description": "Coupon code to be applied to the quote",
                    "example": "OOM20-DISCOUNT"
                  }
                },
                "required": [
                  "checkInDateLocalized",
                  "checkOutDateLocalized",
                  "listingId",
                  "source",
                  "guestsCount"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "accountId": {
                      "type": "string"
                    },
                    "reservationId": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "valid"
                      ]
                    },
                    "guestsCount": {
                      "type": "number",
                      "minimum": 1,
                      "example": 1
                    },
                    "channel": {
                      "enum": [
                        "manual_reservations",
                        "owner_reservations",
                        "booking_engine"
                      ],
                      "type": "string"
                    },
                    "source": {
                      "type": "string",
                      "example": "source-fb-for-bi"
                    },
                    "stay": {
                      "example": [
                        {
                          "checkInDateLocalized": "2021-12-20",
                          "checkOutDateLocalized": "2021-12-22",
                          "guestsCount": 3,
                          "numberOfGuests": {
                            "numberOfAdults": 3,
                            "numberOfChildren": 0,
                            "numberOfInfants": 0
                          },
                          "unitTypeId": "5e384c9fc2700d002670b61b",
                          "unitId": "5e384c9fc2700d002670b61b",
                          "ratePlanId": "5e384c9fc2700d002670b61b"
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
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
                          },
                          "_id": {
                            "type": "object",
                            "properties": {}
                          },
                          "checkInDateLocalized": {
                            "type": "string"
                          },
                          "checkOutDateLocalized": {
                            "type": "string"
                          },
                          "guestsCount": {
                            "type": "number"
                          },
                          "unitTypeId": {
                            "type": "object",
                            "properties": {}
                          },
                          "unitId": {
                            "type": "object",
                            "properties": {}
                          },
                          "ratePlanId": {
                            "type": "string"
                          },
                          "eta": {
                            "format": "date-time",
                            "type": "string"
                          },
                          "etd": {
                            "format": "date-time",
                            "type": "string"
                          },
                          "earlyCheckIn": {
                            "type": "object",
                            "properties": {}
                          },
                          "lateCheckOut": {
                            "type": "object",
                            "properties": {}
                          }
                        },
                        "required": [
                          "checkInDateLocalized",
                          "checkOutDateLocalized",
                          "guestsCount",
                          "unitTypeId",
                          "eta",
                          "etd"
                        ]
                      }
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "expiresAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "unitTypeId": {
                      "type": "string"
                    },
                    "unitId": {
                      "type": "string"
                    },
                    "unassign": {
                      "type": "boolean"
                    },
                    "checkInDateLocalized": {
                      "type": "string"
                    },
                    "checkOutDateLocalized": {
                      "type": "string"
                    },
                    "rates": {
                      "type": "object"
                    },
                    "bookerId": {
                      "type": "string"
                    },
                    "coupons": {
                      "type": "array",
                      "items": {
                        "type": "object"
                      }
                    },
                    "promotions": {
                      "type": "object"
                    },
                    "alterationPayload": {
                      "type": "object",
                      "properties": {
                        "dates": {
                          "type": "object",
                          "properties": {
                            "checkInDateLocalized": {
                              "type": "string"
                            },
                            "checkOutDateLocalized": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "checkInDateLocalized",
                            "checkOutDateLocalized"
                          ]
                        },
                        "unit": {
                          "type": "object",
                          "properties": {
                            "unitId": {
                              "type": "string"
                            },
                            "unitTypeId": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "unitTypeId"
                          ]
                        },
                        "guestsCount": {
                          "type": "number"
                        },
                        "ratePlanId": {
                          "type": "string"
                        },
                        "reservationId": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string",
                          "enum": [
                            "confirmed",
                            "reserved",
                            "awaiting_payment",
                            "inquiry",
                            "canceled",
                            "closed",
                            "declined",
                            "expired"
                          ]
                        },
                        "numberOfGuests": {
                          "type": "object",
                          "properties": {
                            "numberOfChildren": {
                              "type": "number"
                            },
                            "numberOfInfants": {
                              "type": "number"
                            },
                            "numberOfAdults": {
                              "type": "number"
                            }
                          },
                          "required": [
                            "numberOfAdults"
                          ]
                        }
                      },
                      "required": [
                        "reservationId"
                      ]
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
                    },
                    "pointOfSale": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "status",
                    "guestsCount",
                    "channel",
                    "source",
                    "createdAt",
                    "expiresAt",
                    "unitTypeId",
                    "checkInDateLocalized",
                    "checkOutDateLocalized",
                    "rates",
                    "coupons",
                    "promotions"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "500": {
            "description": "Indicates server-side error while processing the request"
          }
        },
        "tags": [
          "Quotes Open Api [Beta]"
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
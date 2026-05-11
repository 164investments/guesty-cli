# Create multiple quotes for reservation

This endpoint allows the creation of multiple price quotes for a reservation.

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
    "/quotes/multiple": {
      "post": {
        "operationId": "QuotesOpenApiController_createMultiple",
        "summary": "Create multiple quotes for reservation",
        "description": "This endpoint allows the creation of multiple price quotes for a reservation.",
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
                  "quotes": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "checkInDateLocalized": {
                          "type": "string",
                          "description": "Booker's check-in date",
                          "example": "2021-01-04"
                        },
                        "checkOutDateLocalized": {
                          "type": "string",
                          "description": "Booker's check-out date",
                          "example": "2021-01-05"
                        },
                        "unitId": {
                          "type": "string",
                          "description": "The unit ID (MTL Child or Single listing)",
                          "example": "6213b03e7f0ba50032296f4a"
                        },
                        "unitTypeId": {
                          "type": "string",
                          "description": "The unit type ID (MTL Parent or Single listing)",
                          "example": "6213b03e7f0ba50032296f4a"
                        },
                        "guestsCount": {
                          "type": "number",
                          "description": "Count of guests",
                          "minimum": 1,
                          "example": 2
                        },
                        "bookerId": {
                          "type": "string",
                          "description": "The booker ID",
                          "example": "1e384c9fc2700d002670b61c"
                        },
                        "source": {
                          "type": "string",
                          "description": "Source of the inquiry",
                          "example": "fb-campaign"
                        },
                        "channel": {
                          "type": "string",
                          "description": "The channel that sent the inquiry",
                          "enum": [
                            "manual_reservations",
                            "owner_reservations",
                            "booking_engine"
                          ]
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
                        "applyPromotions": {
                          "type": "boolean",
                          "description": "Whether to apply promotions",
                          "example": false,
                          "default": true
                        },
                        "stay": {
                          "description": "List of stays",
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "count": {
                          "type": "number",
                          "description": "The number of inquiries to create",
                          "example": 2
                        }
                      },
                      "required": [
                        "checkInDateLocalized",
                        "checkOutDateLocalized",
                        "unitTypeId",
                        "source",
                        "applyPromotions",
                        "count"
                      ]
                    }
                  }
                },
                "required": [
                  "quotes"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "The quotes have been successfully created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "unitTypeId": {
                            "type": "string"
                          },
                          "unitId": {
                            "type": "string"
                          },
                          "inquiryId": {
                            "type": "string"
                          },
                          "errorMessage": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "unitTypeId",
                          "unitId",
                          "inquiryId",
                          "errorMessage"
                        ]
                      }
                    },
                    "results": {
                      "type": "array",
                      "items": {
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
                  },
                  "required": [
                    "errors",
                    "results"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Multiple quote creation failed."
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
# Retrieve a Quote by ID

This endpoint allows retrieval of a specific quote using its unique ID. It is used to fetch details of a previously created quote. If the quote has expired, the endpoint returns an error message indicating that the quote is expired and suggests creating a new quote.

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
    "/quotes/{quoteId}": {
      "get": {
        "operationId": "QuotesOpenApiController_getQuote",
        "summary": "Retrieve a Quote by ID",
        "description": "This endpoint allows retrieval of a specific quote using its unique ID. It is used to fetch details of a previously created quote. If the quote has expired, the endpoint returns an error message indicating that the quote is expired and suggests creating a new quote.",
        "parameters": [
          {
            "name": "quoteId",
            "required": true,
            "in": "path",
            "description": "The unique identifier of the quote being retrieved",
            "schema": {
              "example": "df7hf01cnduhdb2125854dj8",
              "type": "string"
            }
          },
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
        "responses": {
          "200": {
            "description": "Successful retrieval of the quote",
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
            "description": "Returned if the quoteId is missing or malformed"
          },
          "404": {
            "description": "Returned if the quote with the specified ID does not exist"
          },
          "410": {
            "description": "Returned if the quote has expired. The error message should indicate \"Quote is expired, please create a new quote.\""
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
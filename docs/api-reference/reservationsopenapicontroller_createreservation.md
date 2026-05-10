# Create a reservation from quote

Create a reservation based on an existing quote with all the necessary reservation data. You can create a quote using the [dedicated endpoint](https://open-api-docs.guesty.com/reference/quotesopenapicontroller_create) or the [booking engine API](https://booking-api-docs.guesty.com/reference/createreservationquote).

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
      "name": "Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/quote": {
      "post": {
        "operationId": "ReservationsOpenApiController_createReservation",
        "summary": "Create a reservation from quote",
        "description": "Create a reservation based on an existing quote with all the necessary reservation data. You can create a quote using the [dedicated endpoint](https://open-api-docs.guesty.com/reference/quotesopenapicontroller_create) or the [booking engine API](https://booking-api-docs.guesty.com/reference/createreservationquote).",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "quoteId": {
                    "type": "string",
                    "description": "The quote to convert into a reservation",
                    "example": "6213b03e7f0ba50032296f4a"
                  },
                  "status": {
                    "enum": [
                      "confirmed",
                      "reserved",
                      "awaiting_payment",
                      "inquiry",
                      "canceled",
                      "closed",
                      "declined",
                      "expired"
                    ],
                    "type": "string",
                    "description": "Choose from: \"inquiry\", \"reserved\", or \"confirmed\"",
                    "example": "confirmed"
                  },
                  "ratePlanId": {
                    "type": "string",
                    "description": "The ID of an active rate plan when you wish to apply it to the reservation",
                    "example": "5f92cbf10cf217478ba93561"
                  },
                  "reservedUntil": {
                    "enum": [
                      -1,
                      0.5,
                      0.25,
                      0.17,
                      12,
                      24,
                      36,
                      48,
                      72
                    ],
                    "type": "number",
                    "description": "It can be -1 (no limit), 0.17 (10 minutes), 0.25 (15 minutes), 0.5 (30 minutes), or 24/48/72 hours when the reservation is a booking request that reserves dates (i.e., status = “reserved”)",
                    "example": "-1",
                    "default": -1
                  },
                  "guestId": {
                    "type": "string",
                    "description": "The primary ID for returning/existing guests and new guests that were created beforehand",
                    "example": "5f92cbf10cf217478ba93532"
                  },
                  "guest": {
                    "description": "For a new guest. We recommend you create the guest first in a separate request and attach their ID to the reservation instead",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "firstName": {
                            "type": "string",
                            "description": "Guest's first name",
                            "example": "Joe"
                          },
                          "lastName": {
                            "type": "string",
                            "description": "Guest's last name",
                            "example": "Black"
                          },
                          "phones": {
                            "description": "The guest’s phone numbers written in E.164 format:  [+] [country code] [subscriber number including area code]",
                            "example": [
                              "+972-525180054",
                              "+972-225146062"
                            ],
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "email": {
                            "type": "string",
                            "description": "Guest's primary email address",
                            "example": "guest@email.com"
                          },
                          "address": {
                            "description": "Guest's address",
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "street": {
                                    "type": "string",
                                    "description": "The street address, including house number and street name. It can also be a PO Box",
                                    "example": "1000 5th Ave"
                                  },
                                  "zipCode": {
                                    "type": "string",
                                    "description": "The postal code or ZIP code of the address",
                                    "example": "10028"
                                  },
                                  "city": {
                                    "type": "string",
                                    "description": "The name of the city or town or village",
                                    "example": "New York"
                                  },
                                  "state": {
                                    "type": "string",
                                    "description": "The state or province name",
                                    "example": "New York"
                                  },
                                  "country": {
                                    "type": "string",
                                    "description": "The [full name](https://www.iban.com/country-codes) of the country",
                                    "example": "United States"
                                  },
                                  "countryCode": {
                                    "type": "string",
                                    "description": "The two-letter [ISO 3166 Alpha-2](https://www.iban.com/country-codes) country code",
                                    "example": "US"
                                  }
                                }
                              }
                            ]
                          },
                          "preferredLanguage": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "firstName",
                          "lastName",
                          "phones",
                          "email"
                        ]
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
                  "confirmedAt": {
                    "format": "date-time",
                    "type": "string",
                    "description": "Define the confirmation date. If null and status is confirmed, use the current date (YYYY-MM-DDTHh.mm.ssZ). If null and status is not confirmed, leave it as null"
                  },
                  "confirmationCode": {
                    "type": "string",
                    "maxLength": 50,
                    "description": "Define the confirmation code"
                  },
                  "origin": {
                    "type": "string",
                    "maxLength": 50,
                    "description": "The origin of the reservation",
                    "example": "YourPorter"
                  },
                  "originId": {
                    "type": "string",
                    "maxLength": 50,
                    "description": "The origin id of the reservation",
                    "example": "external-id-example"
                  }
                },
                "required": [
                  "quoteId",
                  "status"
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
                    "reservationId": {
                      "type": "string"
                    },
                    "quoteId": {
                      "type": "string"
                    },
                    "confirmationCode": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "guestId": {
                      "type": "string"
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
                    "creationTime": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "reservedExpiresAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "checkInDate": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "checkOutDate": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "unitTypeId": {
                      "type": "string"
                    },
                    "unitId": {
                      "type": "string"
                    },
                    "source": {
                      "type": "string"
                    },
                    "channel": {
                      "type": "string"
                    },
                    "guestsCount": {
                      "type": "number"
                    },
                    "creationInfo": {
                      "type": "object",
                      "properties": {}
                    }
                  },
                  "required": [
                    "reservationId",
                    "quoteId",
                    "confirmationCode",
                    "status",
                    "guestId",
                    "numberOfGuests",
                    "creationTime",
                    "reservedExpiresAt",
                    "checkInDate",
                    "checkOutDate",
                    "unitTypeId",
                    "unitId",
                    "source",
                    "channel",
                    "guestsCount",
                    "creationInfo"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "422": {
            "description": "Returned if required fields are missing or there is a validation error in the request body"
          },
          "500": {
            "description": "Indicates server-side error while processing the request"
          }
        },
        "tags": [
          "Reservations Open Api [Beta]"
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
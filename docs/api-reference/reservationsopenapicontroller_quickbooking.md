# Create a Reservation Without a Quote

Create a reservation without needing a quote. When the listing doesn't have an active rate plan assigned, a default rate plan is selected. Otherwise, the first active rate plan is selected.

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
    "/reservations-v3": {
      "post": {
        "operationId": "ReservationsOpenApiController_quickBooking",
        "summary": "Create a Reservation Without a Quote",
        "description": "Create a reservation without needing a quote. When the listing doesn't have an active rate plan assigned, a default rate plan is selected. Otherwise, the first active rate plan is selected.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "checkInDateLocalized": {
                    "type": "string",
                    "description": "The reservation check-in date, localized to the property’s timezone (YYYY-MM-DD)",
                    "example": "2024-01-01"
                  },
                  "checkOutDateLocalized": {
                    "type": "string",
                    "description": "The reservation check-out date, localized to the property’s timezone (YYYY-MM-DD)",
                    "example": "2024-01-02"
                  },
                  "listingId": {
                    "type": "string",
                    "description": "The property’s ID as defined in Guesty",
                    "example": "5f92cbf10cf217478ba93561"
                  },
                  "source": {
                    "type": "string",
                    "description": "Define the source for getting an updated price quote",
                    "example": "manual"
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
                    "description": "Define the reservation status",
                    "example": "confirmed"
                  },
                  "guestId": {
                    "type": "string",
                    "description": "The primary ID for returning guests and new guests that were created beforehand",
                    "example": "5f92cbf10cf217478ba93532"
                  },
                  "guest": {
                    "description": "For a new guest, note that we recommend that you create the guest first in a separate request and add their guestId to the reservation instead",
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
                  "guestsCount": {
                    "type": "number",
                    "description": "Number of guests to be included in the quote",
                    "example": 2
                  },
                  "numberOfGuests": {
                    "description": "Total number of guests with breakdown",
                    "example": {
                      "numberOfAdults": 2,
                      "numberOfChildren": 0,
                      "numberOfInfants": 0,
                      "numberOfPets": 0
                    },
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
                  "couponCode": {
                    "type": "string",
                    "description": "A single coupon code defined under the accounted Revenue Management settings",
                    "example": "OOM20-DISCOUNT"
                  },
                  "ratePlanId": {
                    "type": "string",
                    "description": "The ID of an active rate plan when you wish to apply it to the reservation",
                    "example": "5f92cbf10cf217478ba93561"
                  },
                  "accommodationFare": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Override the accommodation fare with a fixed amount. Must be zero or greater. This will override the calculated nightly rates.",
                    "example": 250
                  },
                  "cleaningFee": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Add a cleaning fee with a fixed amount. Must be zero or greater.",
                    "example": 250
                  },
                  "applyPromotions": {
                    "type": "boolean",
                    "default": true,
                    "description": "Apply account promotions setup (if toggled off (false), do not take promotions when creating a reservation)",
                    "example": false
                  },
                  "ignoreCalendar": {
                    "type": "boolean",
                    "default": false,
                    "description": "The system will check calendar availability and decline (401) if unavailable unless this flag is set to true",
                    "example": true
                  },
                  "ignoreTerms": {
                    "type": "boolean",
                    "default": false,
                    "description": "The system will ensure the reservation accords with the terms (min, max nights, any other terms) of the property and will decline(401) if it is. To override, set this flag to true",
                    "example": true
                  },
                  "ignoreBlocks": {
                    "type": "boolean",
                    "default": false,
                    "description": "Set this flag to true to ignore existing flexible blocks (advance notice, preparation time, etc)",
                    "example": true
                  },
                  "confirmedAt": {
                    "format": "date-time",
                    "type": "string",
                    "description": "Define the confirmation date. If null and status is confirmed, use the current date. If null and status is not confirmed, leave it as null",
                    "example": "2024-07-06T09:12:06.574Z"
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
                    "example": 36
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
                  "checkInDateLocalized",
                  "checkOutDateLocalized",
                  "listingId",
                  "source",
                  "status",
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
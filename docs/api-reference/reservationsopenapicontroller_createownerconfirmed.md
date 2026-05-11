# Create a confirmed owner reservation

Create a confirmed owner reservation - This endpoint enables the creation of an Owner Reservation instantly with minimal required input. It is designed for simplicity and speed, focusing on essential details only. Behind the scenes, it will create a quote + reservation from a quote picking the first applicable rate plan and promotions

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
    "/reservations-v3/owner/confirmed": {
      "post": {
        "operationId": "ReservationsOpenApiController_createOwnerConfirmed",
        "summary": "Create a confirmed owner reservation",
        "description": "Create a confirmed owner reservation - This endpoint enables the creation of an Owner Reservation instantly with minimal required input. It is designed for simplicity and speed, focusing on essential details only. Behind the scenes, it will create a quote + reservation from a quote picking the first applicable rate plan and promotions",
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
                    "description": "The date when the Owner will check in - with the format of YYYY-MM-DD",
                    "example": "2021-01-01"
                  },
                  "checkOutDateLocalized": {
                    "type": "string",
                    "description": "The date when the Owner will check out - with the format of YYYY-MM-DD",
                    "example": "2021-01-02"
                  },
                  "listingId": {
                    "type": "string",
                    "description": "Listing Id of the unit that the Owner will be staying in",
                    "example": "5f92cbf10cf217478ba93561"
                  },
                  "guestId": {
                    "type": "string",
                    "description": "Guest id of the guest that will be staying in",
                    "example": "5f92cbf10cf217478ba93532"
                  },
                  "guest": {
                    "description": "The Owner or Owner's guest for specific reservation",
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
                  "numberOfGuests": {
                    "description": "Total number of guests with breakdown",
                    "example": {
                      "numberOfAdults": 2,
                      "numberOfChildren": 0,
                      "numberOfInfants": 0
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
                  "source": {
                    "enum": [
                      "owner",
                      "owner-guest"
                    ],
                    "type": "string",
                    "description": "Source of reservation. \"owner\" for owner reservations, \"owner-guest\" for owner friends & family reservations",
                    "example": "owner"
                  },
                  "guestsCount": {
                    "type": "number",
                    "minimum": 1,
                    "description": "Count of guests",
                    "example": 2
                  },
                  "notes": {
                    "description": "The reservation notes",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "other": {
                            "type": "string",
                            "description": "Other notes",
                            "example": "Other notes"
                          },
                          "cleaning": {
                            "type": "string",
                            "description": "Notes for cleaning",
                            "example": "Cleaning notes"
                          },
                          "guest": {
                            "type": "string",
                            "description": "For notes about the guest",
                            "example": "Guest notes"
                          },
                          "specialRequests": {
                            "type": "string",
                            "description": "For recording the guest's special requests",
                            "example": "Special request"
                          },
                          "keyCode": {
                            "type": "string",
                            "description": "Store the relevant key code for using with workflow automation",
                            "example": "123456"
                          },
                          "doneBy": {
                            "type": "string",
                            "description": "The name of the Guesty user"
                          }
                        }
                      }
                    ]
                  },
                  "creationInfo": {
                    "description": "Keeps info about who created the reservation.",
                    "example": {
                      "owner": {
                        "_id": "5f92cbf10cf217478ba93532"
                      }
                    },
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "owner": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "string",
                                "description": "The owner ID",
                                "example": "6213b03e7f0ba50032296f4a"
                              },
                              "fullName": {
                                "type": "string",
                                "description": "The owner's full name",
                                "example": "John Doe"
                              },
                              "email": {
                                "type": "string",
                                "description": "The owner's email",
                                "example": "john.doe@example.com"
                              },
                              "phone": {
                                "type": "string",
                                "description": "The owner's phone number",
                                "example": "+1 123 456 7890"
                              },
                              "locale": {
                                "type": "string",
                                "description": "The owner's locale",
                                "example": "en-US"
                              }
                            },
                            "required": [
                              "_id"
                            ]
                          }
                        },
                        "required": [
                          "owner"
                        ]
                      }
                    ]
                  }
                },
                "required": [
                  "checkInDateLocalized",
                  "checkOutDateLocalized",
                  "listingId",
                  "source",
                  "creationInfo"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Reservation created",
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
          "201": {
            "description": "",
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
          "422": {
            "description": "Validation error failed from create reservation."
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
# Create a mid-stay

Relocate guests to a different listing during their stay

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
    "/reservations-v3/mid-stay": {
      "post": {
        "operationId": "ReservationsOpenApiController_createMidStay",
        "summary": "Create a mid-stay",
        "description": "Relocate guests to a different listing during their stay",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reservationId": {
                    "type": "string",
                    "description": "Reservation ID",
                    "example": "6213b03e7f0ba50032296f4a"
                  },
                  "checkInDateLocalized": {
                    "type": "string",
                    "example": "2024-01-25"
                  },
                  "unitTypeId": {
                    "type": "string",
                    "example": "65aff36cbf774b59c718a0c7"
                  },
                  "unitId": {
                    "type": "string",
                    "example": "65aff3853c12c9228bca87f1"
                  },
                  "ratePlanId": {
                    "type": "string",
                    "example": "65aff3853c12c9228bca87f1"
                  }
                },
                "required": [
                  "reservationId",
                  "checkInDateLocalized",
                  "unitTypeId",
                  "unitId"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Mid-Stay Created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "object",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "integrationId": {
                      "type": "object",
                      "example": "df7hf01cnduhdb2125854dj9"
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
                    "bookerId": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "platform": {
                      "type": "string",
                      "example": "direct"
                    },
                    "quoteId": {
                      "type": "object",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "accountId": {
                      "type": "object",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "source": {
                      "type": "string",
                      "example": "fb-campaign-01"
                    },
                    "confirmedAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "moneyId": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "alteredAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "conversationId": {
                      "type": "string",
                      "example": "df7hf01cnduhdb2125854dj8"
                    },
                    "guestStay": {
                      "type": "object",
                      "properties": {
                        "doneBy": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
                            "type": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "type"
                          ]
                        },
                        "createdAt": {
                          "format": "date-time",
                          "type": "string"
                        },
                        "updatedAt": {
                          "format": "date-time",
                          "type": "string"
                        },
                        "status": {
                          "enum": [
                            "not_set",
                            "checked_in",
                            "checked_out",
                            "no_show"
                          ],
                          "type": "string"
                        }
                      },
                      "required": [
                        "createdAt",
                        "updatedAt",
                        "status"
                      ]
                    },
                    "creationFlow": {
                      "enum": [
                        "OPEN_API",
                        "INTERNAL",
                        "RESERVATIONS_UPLOAD",
                        "MAILER"
                      ],
                      "type": "string"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "customFields": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string"
                          },
                          "fieldId": {
                            "type": "string"
                          },
                          "value": {
                            "type": "object"
                          }
                        },
                        "required": [
                          "_id",
                          "fieldId",
                          "value"
                        ]
                      }
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
                    "confirmationCode": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "_id",
                    "integrationId",
                    "stay",
                    "bookerId",
                    "platform",
                    "quoteId",
                    "accountId",
                    "source",
                    "confirmedAt",
                    "moneyId",
                    "conversationId",
                    "guestStay",
                    "creationFlow",
                    "createdAt",
                    "status",
                    "confirmationCode"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Bad Request - Various validation and availability errors",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "statusCode": {
                      "type": "number",
                      "example": 400
                    },
                    "message": {
                      "type": "string"
                    },
                    "error": {
                      "type": "string",
                      "example": "Bad Request"
                    }
                  }
                },
                "examples": {
                  "validationError": {
                    "summary": "Validation error - failed confirming mid stay alteration",
                    "value": {
                      "statusCode": 400,
                      "message": "Validation error - failed confirming mid stay alteration",
                      "error": "Bad Request"
                    }
                  },
                  "missingPayload": {
                    "summary": "Missing alteration payload",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Inquiry is missing alterationPayload field",
                      "error": "Bad Request"
                    }
                  },
                  "unitNotFound": {
                    "summary": "Unit not found",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Specified unit was not found under the unit type",
                      "error": "Bad Request"
                    }
                  },
                  "timingConstraint": {
                    "summary": "Invalid relocation timing",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Guest can be relocated mid-stay at least 1 day after check-in and at least 1 day before check-out",
                      "error": "Bad Request"
                    }
                  },
                  "invalidCheckinDate": {
                    "summary": "Invalid check-in date sequence",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Check-in date for mid-stay relocation should be after the last stay's check-in date",
                      "error": "Bad Request"
                    }
                  },
                  "dateOutOfRange": {
                    "summary": "Check-in date out of reservation range",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Check-in date for mid-stay relocation should be between the reservation's check-in date and check-out date",
                      "error": "Bad Request"
                    }
                  },
                  "availabilityError": {
                    "summary": "Date/unit not available",
                    "value": {
                      "statusCode": 400,
                      "message": "AVAILABILITY_ERROR - Date/unit is not available",
                      "error": "Bad Request"
                    }
                  },
                  "noRatePlans": {
                    "summary": "No rate plans found",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - No rate plans found for the new stay",
                      "error": "Bad Request"
                    }
                  },
                  "guestAlreadyStayed": {
                    "summary": "Guest already stayed in unit",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Guest already stayed in the unit",
                      "error": "Bad Request"
                    }
                  },
                  "reservationNotConfirmed": {
                    "summary": "Reservation not confirmed",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Mid stay can be created only for confirmed reservations",
                      "error": "Bad Request"
                    }
                  },
                  "invalidCheckinSequence": {
                    "summary": "Invalid check-in date sequence",
                    "value": {
                      "statusCode": 400,
                      "message": "VALIDATION_ERROR - Check-in date for mid-stay relocation should be after the last stay's check-in date",
                      "error": "Bad Request"
                    }
                  }
                }
              }
            }
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
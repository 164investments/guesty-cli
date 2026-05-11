# Get owner

Get owner

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
      "name": "Owners"
    }
  ],
  "paths": {
    "/owners/{ownerId}": {
      "get": {
        "operationId": "OwnersOpenApiController_get",
        "summary": "Get owner",
        "description": "Get owner",
        "parameters": [
          {
            "name": "ownerId",
            "required": true,
            "in": "path",
            "description": "Owner id",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": false,
            "in": "query",
            "description": "Selection of fields, separated by space.\n    If fields are not provided, the response will return with all fields.\n    Possible values depend on the response type.\n    For example, owners:\n    _id firstName lastName fullName email address phone picture notes ownersPortalSettings\n    listings locale active createdAt",
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "611d02b7c9c54b01736ae01d",
                      "description": "Owner id"
                    },
                    "accountId": {
                      "type": "string",
                      "example": "611cf837c9c54b01736ae01c",
                      "description": "Account id"
                    },
                    "guestId": {
                      "type": "string",
                      "example": "611cf837c9c54b01736ae01c",
                      "description": "Guest id used for owner reservations"
                    },
                    "guestIds": {
                      "example": [
                        "611cf837c9c54b01736ae01c"
                      ],
                      "description": "Array of friends & family guests ids for this owner",
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "listings": {
                      "type": "object",
                      "example": [
                        "611cf837c9c54b01736ae01c"
                      ],
                      "description": "Array of listings ids"
                    },
                    "email": {
                      "type": "string",
                      "example": "example@email.com"
                    },
                    "firstName": {
                      "type": "string",
                      "example": "John"
                    },
                    "lastName": {
                      "type": "string",
                      "example": "Doe"
                    },
                    "fullName": {
                      "type": "string",
                      "example": "John Doe"
                    },
                    "notes": {
                      "type": "string"
                    },
                    "address": {
                      "type": "string"
                    },
                    "personalAddress": {
                      "type": "object",
                      "properties": {
                        "street": {
                          "type": "string"
                        },
                        "city": {
                          "type": "string"
                        },
                        "state": {
                          "type": "string"
                        },
                        "zipcode": {
                          "type": "string"
                        },
                        "country": {
                          "type": "string"
                        },
                        "full": {
                          "type": "string"
                        }
                      }
                    },
                    "phone": {
                      "type": "string"
                    },
                    "active": {
                      "type": "boolean"
                    },
                    "locale": {
                      "type": "string",
                      "example": "en-US"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "deletedAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "allowReservations": {
                      "type": "boolean",
                      "deprecated": true,
                      "description": "Deprecated. Use ownersPortalSettings.allowReservations"
                    },
                    "showReservationTooltips": {
                      "type": "boolean",
                      "deprecated": true,
                      "description": "Deprecated. Use ownersPortalSettings.allowReservations"
                    },
                    "ownersPortalSettings": {
                      "type": "object",
                      "properties": {
                        "revenue": {
                          "type": "boolean"
                        },
                        "accommodationFare": {
                          "type": "boolean"
                        },
                        "netRentalIncome": {
                          "type": "boolean"
                        },
                        "rentalIncome": {
                          "type": "boolean"
                        },
                        "netAccommodationFare": {
                          "type": "boolean"
                        },
                        "revPal": {
                          "type": "boolean"
                        },
                        "occupancy": {
                          "type": "boolean"
                        },
                        "bookedNights": {
                          "type": "boolean"
                        },
                        "bookingInquiresCount": {
                          "type": "boolean"
                        },
                        "avgNightlyRate": {
                          "type": "boolean"
                        },
                        "avgBookingValue": {
                          "type": "boolean"
                        },
                        "avgGuestStay": {
                          "type": "boolean"
                        },
                        "platformBreakdown": {
                          "type": "boolean"
                        },
                        "nightlyRate": {
                          "type": "boolean"
                        },
                        "minNights": {
                          "type": "boolean"
                        },
                        "showInternalNotesForBlocks": {
                          "type": "boolean"
                        },
                        "bookingSource": {
                          "type": "boolean"
                        },
                        "hostPayout": {
                          "type": "boolean"
                        },
                        "showReservedReservations": {
                          "type": "boolean"
                        },
                        "showReservationTooltips": {
                          "type": "boolean"
                        },
                        "showGuestFullName": {
                          "type": "boolean"
                        },
                        "showGuestEmail": {
                          "type": "boolean"
                        },
                        "showGuestPhone": {
                          "type": "boolean"
                        },
                        "allowReservations": {
                          "type": "boolean"
                        },
                        "allowChangeCheckinCheckoutTime": {
                          "type": "boolean"
                        },
                        "showNotesForCoOwnerReservations": {
                          "type": "boolean"
                        },
                        "ownerReservationRevenueLoss": {
                          "type": "boolean"
                        },
                        "ownerReservationBookedNights": {
                          "type": "boolean"
                        },
                        "upcomingReservations": {
                          "type": "boolean"
                        },
                        "showOptionalCleaningService": {
                          "type": "boolean"
                        },
                        "showOptionalLinenService": {
                          "type": "boolean"
                        },
                        "guestsReports": {
                          "type": "boolean"
                        },
                        "guestsReportsViewId": {
                          "type": "string"
                        },
                        "showHelpCenter": {
                          "type": "boolean"
                        },
                        "showOverallGuestRating": {
                          "type": "boolean"
                        },
                        "showGuestReviews": {
                          "type": "boolean"
                        },
                        "showGuestReviewsHigherThan4": {
                          "type": "boolean"
                        },
                        "showInspectionTasks": {
                          "type": "boolean"
                        },
                        "showCleaningTasks": {
                          "type": "boolean"
                        }
                      }
                    },
                    "businessInformation": {
                      "type": "object",
                      "properties": {
                        "businessType": {
                          "type": "object",
                          "properties": {
                            "type": {
                              "enum": [
                                "INDIVIDUAL",
                                "LLC_LTD",
                                "CORPORATION",
                                "PARTNERSHIP",
                                "TRUST",
                                "OTHER"
                              ],
                              "type": "string",
                              "description": "Business type classification"
                            },
                            "other": {
                              "type": "string",
                              "description": "Custom business type description when type is OTHER"
                            }
                          }
                        },
                        "address": {
                          "type": "object",
                          "properties": {
                            "street": {
                              "type": "string"
                            },
                            "city": {
                              "type": "string"
                            },
                            "state": {
                              "type": "string"
                            },
                            "zipcode": {
                              "type": "string"
                            },
                            "country": {
                              "type": "string"
                            },
                            "full": {
                              "type": "string"
                            }
                          }
                        },
                        "businessName": {
                          "type": "string"
                        },
                        "vatIdentificationNumber": {
                          "type": "string",
                          "maxLength": 30
                        },
                        "vatRate": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        },
                        "ownerCommission": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100
                        }
                      }
                    },
                    "birthday": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "anniversary": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "picture": {
                      "type": "object",
                      "properties": {
                        "regular": {
                          "type": "string"
                        },
                        "thumbnail": {
                          "type": "string"
                        },
                        "large": {
                          "type": "string"
                        }
                      }
                    },
                    "hasLoggedInAtLeastOnce": {
                      "type": "boolean",
                      "description": "Information about first log in"
                    },
                    "roles": {
                      "type": "string",
                      "example": "owner",
                      "description": "Authorized user role"
                    },
                    "account": {
                      "example": "611d02b7c9c54b01736ae01d",
                      "description": "Account information",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "string"
                            },
                            "accountCategorization": {
                              "type": "number"
                            },
                            "active": {
                              "type": "boolean"
                            },
                            "createdAt": {
                              "format": "date-time",
                              "type": "string"
                            },
                            "currency": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
                            "companyLogo": {
                              "type": "string"
                            },
                            "companyInformation": {
                              "type": "object",
                              "properties": {
                                "name": {
                                  "type": "string"
                                },
                                "contactEmail": {
                                  "type": "string"
                                },
                                "country": {
                                  "type": "string"
                                },
                                "city": {
                                  "type": "string"
                                },
                                "address": {
                                  "type": "string"
                                },
                                "zipCode": {
                                  "type": "string"
                                },
                                "contactPhone": {
                                  "type": "string"
                                },
                                "contactFirstname": {
                                  "type": "string"
                                },
                                "contactLastname": {
                                  "type": "string"
                                },
                                "vatNum": {
                                  "type": "string"
                                },
                                "businessType": {
                                  "type": "string"
                                }
                              }
                            }
                          },
                          "required": [
                            "_id"
                          ]
                        }
                      ]
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "email",
                    "firstName",
                    "lastName"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Validation Failed Error"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "enum": [
                            100,
                            101,
                            102,
                            103,
                            200,
                            201,
                            202,
                            203,
                            204,
                            205,
                            206,
                            300,
                            301,
                            302,
                            303,
                            304,
                            307,
                            308,
                            400,
                            401,
                            402,
                            403,
                            404,
                            405,
                            406,
                            407,
                            408,
                            409,
                            410,
                            411,
                            412,
                            413,
                            414,
                            415,
                            416,
                            417,
                            418,
                            421,
                            422,
                            424,
                            428,
                            429,
                            500,
                            501,
                            502,
                            503,
                            504,
                            505
                          ],
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "property1 must not be less than 0",
                            "property1 must be an integer number"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Validation Failed Error"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "enum": [
                            100,
                            101,
                            102,
                            103,
                            200,
                            201,
                            202,
                            203,
                            204,
                            205,
                            206,
                            300,
                            301,
                            302,
                            303,
                            304,
                            307,
                            308,
                            400,
                            401,
                            402,
                            403,
                            404,
                            405,
                            406,
                            407,
                            408,
                            409,
                            410,
                            411,
                            412,
                            413,
                            414,
                            415,
                            416,
                            417,
                            418,
                            421,
                            422,
                            424,
                            428,
                            429,
                            500,
                            501,
                            502,
                            503,
                            504,
                            505
                          ],
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "property1 must not be less than 0",
                            "property1 must be an integer number"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Owners"
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
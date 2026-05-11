# Retrieve Reservations

Retrieve multiple reservations by ID. Use this endpoint to get all the relevant information about your reservation including the financial breakdown and guest details

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
      "get": {
        "operationId": "ReservationsOpenApiController_getReservationsByIds",
        "summary": "Retrieve Reservations",
        "description": "Retrieve multiple reservations by ID. Use this endpoint to get all the relevant information about your reservation including the financial breakdown and guest details",
        "parameters": [
          {
            "name": "reservationIds",
            "required": true,
            "in": "query",
            "description": "Reservation IDs from Guesty",
            "schema": {
              "maxItems": 10,
              "example": [
                "5f92cbf10cf217478ba93561",
                "5f92cbf10cf217478ba93562"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "includePaymentsTemplate",
            "required": false,
            "in": "query",
            "description": "Include payments template information in the response",
            "schema": {
              "default": false,
              "type": "boolean"
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
            "name": "",
            "required": false,
            "in": "query",
            "description": "If set to true, Markups, ExtraPersonFee, and Discounts are hidden from both the nightly rates and invoice items—they are included within the Accommodation Fee (AF). If set to false, these components are itemized separately in the response.",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "_id": {
                        "type": "object",
                        "example": "df7hf01cnduhdb2125854dj8"
                      },
                      "groupId": {
                        "type": "object",
                        "example": "df7hf01cnduhdb2125854dj8"
                      },
                      "sendQuoteId": {
                        "example": "df7hf01cnduhdb2125854dj8",
                        "allOf": [
                          {
                            "type": "object",
                            "properties": {}
                          }
                        ]
                      },
                      "integrationId": {
                        "type": "object",
                        "example": "df7hf01cnduhdb2125854dj9"
                      },
                      "preApproveState": {
                        "type": "boolean"
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
                      "reservedAt": {
                        "format": "date-time",
                        "type": "string"
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
                        "type": "number"
                      },
                      "canceledAt": {
                        "format": "date-time",
                        "type": "string"
                      },
                      "isAssigned": {
                        "type": "boolean"
                      },
                      "moneyId": {
                        "type": "string",
                        "example": "df7hf01cnduhdb2125854dj8"
                      },
                      "specialRequests": {
                        "type": "string",
                        "example": "notes, requests",
                        "deprecated": true
                      },
                      "keyCode": {
                        "type": "string",
                        "example": "code for the key",
                        "deprecated": true
                      },
                      "alteredAt": {
                        "format": "date-time",
                        "type": "string"
                      },
                      "conversationId": {
                        "type": "string",
                        "example": "df7hf01cnduhdb2125854dj8"
                      },
                      "conversationExternalId": {
                        "type": "string",
                        "example": "1231234234234"
                      },
                      "transportation": {
                        "type": "object"
                      },
                      "agentBooking": {
                        "type": "boolean"
                      },
                      "reasonForVisit": {
                        "enum": [
                          "business",
                          "leisure",
                          "family",
                          "event",
                          "other"
                        ],
                        "type": "string"
                      },
                      "canceledBy": {
                        "enum": [
                          "OWNER",
                          "GUEST",
                          "TEAM_MEMBER"
                        ],
                        "type": "string"
                      },
                      "cancellationReason": {
                        "type": "string"
                      },
                      "cancellationNote": {
                        "type": "string"
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
                      "pointOfSale": {
                        "type": "string"
                      },
                      "creationInfo": {
                        "description": "Reservation creation info. It is used to track the user who created the reservation, currently used for owner reservations.",
                        "example": {
                          "owner": {
                            "_id": "5e384c9fc2700d002670b61b",
                            "fullName": "John Doe",
                            "email": "john.doe@gmail.com",
                            "phone": "+1 123 456 7890",
                            "locale": "en-US"
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
                                    "type": "object",
                                    "properties": {}
                                  },
                                  "fullName": {
                                    "type": "string"
                                  },
                                  "email": {
                                    "type": "string"
                                  },
                                  "phone": {
                                    "type": "string"
                                  },
                                  "locale": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "_id"
                                ]
                              }
                            }
                          }
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
                      "origin": {
                        "type": "string",
                        "example": "YourPorter"
                      },
                      "originId": {
                        "type": "string",
                        "example": "external-id-example"
                      },
                      "importedAt": {
                        "format": "date-time",
                        "type": "string",
                        "example": "2023-04-28T17:20:53.767Z"
                      },
                      "manuallyCreated": {
                        "type": "boolean",
                        "example": true
                      },
                      "uploadedAt": {
                        "format": "date-time",
                        "type": "string",
                        "example": "2023-04-28T17:20:53.767Z",
                        "description": "Date when reservation was uploaded through reservations upload feature"
                      },
                      "unifiedId": {
                        "type": "string",
                        "example": "unified-id-example"
                      },
                      "channelMetadata": {
                        "description": "Reservation channel meta data.",
                        "example": {
                          "channelMetadata": {}
                        },
                        "allOf": [
                          {
                            "type": "object",
                            "properties": {
                              "externalReservationId": {
                                "type": "string"
                              },
                              "externalListingId": {
                                "type": "string"
                              },
                              "hotelId": {
                                "type": "string"
                              },
                              "stayId": {
                                "type": "string"
                              },
                              "hostRole": {
                                "type": "string"
                              },
                              "loyaltyProgram": {
                                "type": "string",
                                "enum": [
                                  "genius"
                                ]
                              },
                              "createdAt": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "confirmedAt": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "updatedAt": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "canceledAt": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "canceledBy": {
                                "type": "string"
                              },
                              "ratePlan": {
                                "type": "object",
                                "properties": {
                                  "name": {
                                    "type": "string"
                                  },
                                  "id": {
                                    "type": "string"
                                  },
                                  "childId": {
                                    "type": "string"
                                  }
                                }
                              },
                              "cancellationTerms": {
                                "type": "object",
                                "properties": {
                                  "penaltyAmount": {
                                    "type": "string"
                                  },
                                  "reasons": {
                                    "type": "array",
                                    "items": {
                                      "type": "string"
                                    }
                                  }
                                }
                              },
                              "cancellationPolicy": {
                                "type": "string"
                              },
                              "isGroupReservation": {
                                "type": "boolean"
                              },
                              "isFullReservationData": {
                                "type": "boolean"
                              }
                            },
                            "required": [
                              "externalReservationId",
                              "externalListingId",
                              "createdAt"
                            ]
                          }
                        ]
                      },
                      "guestPreferences": {
                        "description": "Reservation guest preferences",
                        "example": {
                          "guestPreferences": {
                            "smoking": false
                          }
                        },
                        "allOf": [
                          {
                            "type": "object",
                            "properties": {
                              "smoking": {
                                "type": "boolean"
                              }
                            }
                          }
                        ]
                      },
                      "ratePlans": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "ratePlanId": {
                              "example": "df7hf01cnduhdb2125854dj8",
                              "allOf": [
                                {
                                  "type": "object",
                                  "properties": {}
                                }
                              ]
                            },
                            "name": {
                              "type": "string",
                              "example": "1231234234234"
                            },
                            "mealPlan": {
                              "type": "string",
                              "example": "1231234234234"
                            },
                            "isExternalModificationFound": {
                              "type": "boolean"
                            },
                            "promotionData": {
                              "type": "object",
                              "properties": {
                                "_id": {
                                  "type": "object",
                                  "properties": {}
                                },
                                "name": {
                                  "type": "string"
                                },
                                "externalPromotionId": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "_id",
                                "name",
                                "externalPromotionId"
                              ]
                            },
                            "cancellationPolicy": {
                              "type": "string",
                              "example": "1231234234234"
                            },
                            "cancellationPolicyDescription": {
                              "type": "string",
                              "example": "1231234234234"
                            },
                            "cancellationFee": {
                              "type": "number",
                              "example": "1231234234234"
                            }
                          }
                        }
                      },
                      "channelsSyncState": {
                        "description": "Channel Reservation sync state",
                        "example": {
                          "channelsSyncState": {
                            "listing": {
                              "unlockOnListingId": "listing-id",
                              "syncMode": "DISABLED"
                            }
                          }
                        },
                        "allOf": [
                          {
                            "type": "object",
                            "properties": {
                              "listing": {
                                "type": "object",
                                "properties": {
                                  "unlockOnListingId": {
                                    "type": "string"
                                  },
                                  "syncMode": {
                                    "enum": [
                                      "DISABLED",
                                      "ENABLED"
                                    ],
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "syncMode"
                                ]
                              }
                            }
                          }
                        ]
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
                      "notes": {
                        "type": "object",
                        "properties": {
                          "other": {
                            "type": "string"
                          },
                          "cleaning": {
                            "type": "string"
                          },
                          "guest": {
                            "type": "string"
                          },
                          "specialRequests": {
                            "type": "string"
                          },
                          "keyCode": {
                            "type": "string"
                          }
                        }
                      },
                      "confirmationCode": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "_id",
                      "stay",
                      "bookerId",
                      "platform",
                      "quoteId",
                      "accountId",
                      "source",
                      "createdAt",
                      "status",
                      "notes",
                      "confirmationCode"
                    ]
                  }
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
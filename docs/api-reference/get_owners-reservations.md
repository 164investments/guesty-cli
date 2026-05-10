# List owners reservations

Retrieve a list of all owner reservations. This endpoint is filterable.

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
      "name": "Owners Reservations"
    }
  ],
  "paths": {
    "/owners-reservations": {
      "get": {
        "tags": [
          "Owners Reservations"
        ],
        "summary": "List owners reservations",
        "description": "Retrieve a list of all owner reservations. This endpoint is filterable.",
        "parameters": [
          {
            "name": "filters",
            "in": "query",
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "field": {
                    "type": "string",
                    "description": "Subject of the filter",
                    "properties": {
                      "confirmedAt": {
                        "type": "string",
                        "description": "YYYY-MM-DD"
                      },
                      "checkIn": {
                        "type": "string",
                        "description": "YYYY-MM-DD"
                      },
                      "checkOut": {
                        "type": "string",
                        "description": "YYYY-MM-DD"
                      },
                      "customFields": {
                        "type": "string",
                        "description": "customFields.fieldName"
                      },
                      "owner": {
                        "type": "string",
                        "description": "owner.fieldName",
                        "example": "owner._id"
                      },
                      "listing": {
                        "type": "string",
                        "description": "listing.fieldName",
                        "example": "listing.nickname"
                      }
                    }
                  },
                  "operator": {
                    "type": "string",
                    "description": "Enhanced MongoDB comparison operator: $eq, $not, $contains, etc",
                    "example": "$gt"
                  },
                  "value": {
                    "type": "integer",
                    "description": "Value to filter by",
                    "example": 0
                  }
                }
              },
              "required": [
                "field",
                "operator",
                "value"
              ]
            },
            "description": "Array of filters to query by"
          },
          {
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "String of fields, separated by space. \n\n  Allowed fields are \"account\", \"listing\" and \"owner\" fields with its according subkeys \n\n Please note: Allowed list of keys depend on user role and permissions",
            "example": "checkIn checkOut owner.fullName listing.title"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "ascending sort, use - to descending sort. Default: `_id`",
            "example": "checkIn"
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "description": "Limit for list of records. Default value: `25`, max: `100`",
            "example": "25"
          },
          {
            "in": "query",
            "name": "skip",
            "description": "Skip number of records. In case nothing provided so nothing will be skipped",
            "schema": {
              "type": "integer",
              "default": 0
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Reservation object",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "status": {
                      "type": "string"
                    },
                    "source": {
                      "type": "string"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "listingId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "checkIn": {
                      "type": "string"
                    },
                    "checkOut": {
                      "type": "string"
                    },
                    "note": {
                      "type": "string"
                    },
                    "__v": {
                      "type": "number"
                    },
                    "createdAt": {
                      "type": "string"
                    },
                    "checkInDateLocalized": {
                      "type": "string"
                    },
                    "checkOutDateLocalized": {
                      "type": "string"
                    },
                    "plannedDeparture": {
                      "type": "string"
                    },
                    "plannedArrival": {
                      "type": "string"
                    },
                    "lastUpdatedAt": {
                      "type": "string"
                    },
                    "listing": {
                      "type": "object",
                      "properties": {
                        "_id": {
                          "type": "string",
                          "description": "String (ObjectId)",
                          "example": "59ac245d27cb310f0017afe3"
                        },
                        "accountId": {
                          "type": "string",
                          "description": "String (ObjectId)",
                          "example": "59ac245d27cb310f0017afe3"
                        },
                        "createdAt": {
                          "type": "string",
                          "example": "2017-09-03T15:48:45.070Z"
                        },
                        "integrations": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "5958c7e5884e961000817799"
                              },
                              "airbnb2": {
                                "type": "object",
                                "properties": {
                                  "credentials": {
                                    "type": "object",
                                    "properties": {
                                      "code": {
                                        "type": "string"
                                      },
                                      "expiresAt": {
                                        "type": "integer"
                                      },
                                      "accessToken": {
                                        "type": "string"
                                      },
                                      "refreshToken": {
                                        "type": "string"
                                      },
                                      "lastForceRefresh": {
                                        "type": "string",
                                        "description": "date"
                                      }
                                    }
                                  },
                                  "forwardEmails": {
                                    "type": "object",
                                    "properties": {
                                      "all": {
                                        "type": "boolean",
                                        "default": true
                                      },
                                      "emails": {
                                        "type": "array",
                                        "items": {
                                          "type": "string"
                                        }
                                      }
                                    }
                                  },
                                  "createdAt": {
                                    "type": "string",
                                    "description": "date"
                                  }
                                },
                                "description": "Only if platform is airbnb",
                                "example": {
                                  "ignored": {
                                    "reservations": [],
                                    "listings": []
                                  },
                                  "emailsFromSupport": []
                                }
                              },
                              "forwardEmails": {
                                "type": "object",
                                "properties": {
                                  "all": {
                                    "type": "boolean",
                                    "default": true
                                  },
                                  "emails": {
                                    "type": "array",
                                    "items": {
                                      "type": "string"
                                    }
                                  }
                                }
                              },
                              "active": {
                                "type": "boolean",
                                "description": "Status of connection"
                              },
                              "platform": {
                                "type": "string"
                              },
                              "listings": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "description": "Listing details"
                                }
                              },
                              "complexes": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "description": "Complex details"
                                }
                              },
                              "nickname": {
                                "type": "string",
                                "example": "naama"
                              },
                              "channelId": {
                                "type": "string"
                              },
                              "activatedAt": {
                                "type": "string",
                                "description": "Date"
                              },
                              "disconnectedAt": {
                                "type": "string",
                                "description": "Date"
                              },
                              "proxyEmail": {
                                "type": "string"
                              },
                              "incomingEmail": {
                                "type": "string"
                              },
                              "externalAccountId": {
                                "type": "string"
                              },
                              "id": {
                                "type": "integer",
                                "example": "naama@user.guesty.com",
                                "description": "External ID"
                              },
                              "companyName": {
                                "type": "string"
                              },
                              "fetchRequests": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "fetchAllListings": {
                                      "type": "boolean"
                                    },
                                    "externalListingIds": {
                                      "type": "array",
                                      "items": {
                                        "type": "string"
                                      }
                                    },
                                    "status": {
                                      "type": "string",
                                      "enum": [
                                        "NOT_STARTED",
                                        "IN_PROGRESS",
                                        "COMPLETED",
                                        "FAILED",
                                        "TIMEOUT"
                                      ]
                                    },
                                    "createTime": {
                                      "type": "string",
                                      "description": "Date"
                                    },
                                    "updateTime": {
                                      "type": "string",
                                      "description": "Date"
                                    },
                                    "finishedTime": {
                                      "type": "string",
                                      "description": "Date"
                                    }
                                  }
                                }
                              },
                              "status": {
                                "type": "string",
                                "enum": [
                                  "NOT_CONNECTED",
                                  "CONNECTING",
                                  "CONNECTED",
                                  "FAILED",
                                  "TIMEOUT",
                                  "DISCONNECTED",
                                  "PENDING"
                                ]
                              },
                              "migration": {
                                "type": "object",
                                "properties": {
                                  "status": {
                                    "type": "string",
                                    "enum": [
                                      "IN_PROGRESS",
                                      "COMPLETED",
                                      "FAILED"
                                    ]
                                  },
                                  "createTime": {
                                    "type": "string",
                                    "description": "Date"
                                  },
                                  "updateTime": {
                                    "type": "string",
                                    "description": "Date"
                                  },
                                  "finishedTime": {
                                    "type": "string",
                                    "description": "Date"
                                  },
                                  "steps": {
                                    "type": "array",
                                    "items": {
                                      "type": "object",
                                      "description": "Step details"
                                    }
                                  },
                                  "discrepancyStepExecuted": {
                                    "type": "boolean",
                                    "default": false
                                  },
                                  "discrepancyResolution": {
                                    "type": "string",
                                    "enum": [
                                      "GUESTY",
                                      "AIRBNB"
                                    ]
                                  },
                                  "listingQuantityDiscrepancyStepExecuted": {
                                    "type": "boolean",
                                    "default": false
                                  },
                                  "error": {
                                    "type": "object",
                                    "properties": {
                                      "at": {
                                        "type": "string",
                                        "description": "Date"
                                      },
                                      "code": {
                                        "type": "string"
                                      },
                                      "message": {
                                        "type": "string"
                                      },
                                      "raw": {
                                        "type": "object"
                                      }
                                    }
                                  },
                                  "notes": {
                                    "type": "string"
                                  },
                                  "isRollingBack": {
                                    "type": "boolean",
                                    "default": false
                                  }
                                }
                              },
                              "userId": {
                                "type": "string",
                                "example": "563e0b6a08a2710e00057b85"
                              },
                              "accountId": {
                                "type": "string",
                                "description": "Owner",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "tripAdvisor": {
                                "type": "object",
                                "description": "TripAdvisor details"
                              },
                              "homeaway2": {
                                "type": "object",
                                "description": "Homeaway details"
                              },
                              "bookingCom": {
                                "type": "object",
                                "properties": {
                                  "legalEntityId": {
                                    "type": "string"
                                  }
                                },
                                "description": "BookingCom details"
                              },
                              "createdAt": {
                                "type": "string",
                                "description": "Date"
                              },
                              "missingStep": {
                                "type": "string"
                              },
                              "steps": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "type": {
                                      "type": "string"
                                    },
                                    "status": {
                                      "type": "string",
                                      "enum": [
                                        "COMPLETED",
                                        "IN_PROGRESS"
                                      ]
                                    },
                                    "createTime": {
                                      "type": "string",
                                      "description": "Date"
                                    },
                                    "updateTime": {
                                      "type": "string",
                                      "description": "Date"
                                    }
                                  }
                                }
                              },
                              "newIntegrationBackup": {
                                "type": "object"
                              },
                              "threadIdsMigrated": {
                                "type": "boolean"
                              },
                              "isDeleted": {
                                "type": "boolean"
                              },
                              "deletedAt": {
                                "type": "string",
                                "description": "Date"
                              }
                            }
                          }
                        },
                        "isVirtual": {
                          "type": "boolean"
                        },
                        "nickname": {
                          "type": "string"
                        },
                        "tags": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "isListed": {
                          "type": "boolean"
                        },
                        "title": {
                          "type": "string"
                        },
                        "propertyType": {
                          "type": "string"
                        },
                        "roomType": {
                          "type": "string"
                        },
                        "bedType": {
                          "type": "string"
                        },
                        "accommodates": {
                          "type": "number"
                        },
                        "bedrooms": {
                          "type": "number"
                        },
                        "areaSquareFeet": {
                          "type": "number"
                        },
                        "address": {
                          "type": "object",
                          "properties": {
                            "full": {
                              "type": "string",
                              "description": "full address",
                              "example": "Kaplan St 2, Ramat Gan, Israel"
                            },
                            "lng": {
                              "type": "number",
                              "example": 34.8202173
                            },
                            "lat": {
                              "type": "number",
                              "example": 32.0695525
                            },
                            "street": {
                              "type": "string"
                            },
                            "city": {
                              "type": "string"
                            },
                            "country": {
                              "type": "string"
                            }
                          }
                        },
                        "publishedAddress": {
                          "type": "object",
                          "properties": {
                            "full": {
                              "type": "string",
                              "description": "full address",
                              "example": "Kaplan St 2, Ramat Gan, Israel"
                            },
                            "lng": {
                              "type": "number",
                              "example": 34.8202173
                            },
                            "lat": {
                              "type": "number",
                              "example": 32.0695525
                            },
                            "street": {
                              "type": "string"
                            },
                            "city": {
                              "type": "string"
                            },
                            "country": {
                              "type": "string"
                            }
                          }
                        },
                        "timezone": {
                          "type": "string"
                        },
                        "defaultCheckInTime": {
                          "type": "string"
                        },
                        "defaultCheckOutTime": {
                          "type": "string"
                        },
                        "cleaning": {
                          "type": "object",
                          "properties": {
                            "defaultCleaningTime": {
                              "type": "string"
                            },
                            "instructions": {
                              "type": "string"
                            }
                          }
                        },
                        "cleaningStatus": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "enum": [
                                "clean",
                                "waitingForInspection",
                                "dirty",
                                "unknown"
                              ]
                            },
                            "updatedAt": {
                              "type": "string",
                              "example": "2019-08-24T14:15:22Z"
                            }
                          }
                        },
                        "picture": {
                          "type": "object",
                          "properties": {
                            "regular": {
                              "type": "string"
                            },
                            "thumbnail": {
                              "type": "string",
                              "example": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1659982852/staging6/5213a2d206112710005d96ff/gglflnes8vodgkmtm08c.jpg"
                            },
                            "large": {
                              "type": "string"
                            },
                            "caption": {
                              "type": "string"
                            },
                            "height": {
                              "type": "number",
                              "example": 756
                            },
                            "original": {
                              "type": "string",
                              "example": "https://res.cloudinary.com/guesty/image/upload/v1659982852/staging6/5213a2d206112710005d96ff/gglflnes8vodgkmtm08c.jpg"
                            },
                            "size": {
                              "type": "number",
                              "example": 39516
                            },
                            "width": {
                              "type": "number",
                              "example": 756
                            }
                          }
                        },
                        "pictures": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "regular": {
                                "type": "string"
                              },
                              "thumbnail": {
                                "type": "string",
                                "example": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1659982852/staging6/5213a2d206112710005d96ff/gglflnes8vodgkmtm08c.jpg"
                              },
                              "large": {
                                "type": "string"
                              },
                              "caption": {
                                "type": "string"
                              },
                              "height": {
                                "type": "number",
                                "example": 756
                              },
                              "original": {
                                "type": "string",
                                "example": "https://res.cloudinary.com/guesty/image/upload/v1659982852/staging6/5213a2d206112710005d96ff/gglflnes8vodgkmtm08c.jpg"
                              },
                              "size": {
                                "type": "number",
                                "example": 39516
                              },
                              "width": {
                                "type": "number",
                                "example": 756
                              }
                            }
                          }
                        },
                        "amenities": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "amenitiesNotIncluded": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "terms": {
                          "type": "object",
                          "properties": {
                            "minNights": {
                              "type": "number"
                            },
                            "maxNights": {
                              "type": "number"
                            },
                            "cancellation": {
                              "type": "string"
                            }
                          }
                        },
                        "prices": {
                          "type": "object",
                          "properties": {
                            "guestsIncludedInRegularFee": {
                              "type": "number"
                            },
                            "extraPersonFee": {
                              "type": "number"
                            },
                            "basePrice": {
                              "type": "number"
                            },
                            "basePriceUSD": {
                              "type": "number"
                            },
                            "monthlyPriceFactor": {
                              "type": "number",
                              "example": "0.90",
                              "description": "Accepted values are float values between 0 and 1. In order to have 10% discount set 0.90. To have 5% discount set 0.95."
                            },
                            "weeklyPriceFactor": {
                              "type": "number",
                              "example": "0.90",
                              "description": "Accepted values are float values between 0 and 1. In order to have 10% discount set 0.90. To have 5% discount set 0.95."
                            },
                            "weekendBasePrice": {
                              "type": "number"
                            },
                            "securityDepositFee": {
                              "type": "number"
                            },
                            "currency": {
                              "type": "string"
                            },
                            "cleaningFee": {
                              "type": "number"
                            }
                          }
                        },
                        "netIncomeFormula": {
                          "type": "string"
                        },
                        "commissionFormula": {
                          "type": "string"
                        },
                        "commissionTaxPrecentage": {
                          "type": "string"
                        },
                        "pms": {
                          "type": "object",
                          "properties": {
                            "active": {
                              "type": "boolean"
                            },
                            "automation": {
                              "type": "object",
                              "properties": {
                                "autoList": {
                                  "type": "object",
                                  "properties": {
                                    "active": {
                                      "type": "boolean"
                                    },
                                    "config": {
                                      "type": "array",
                                      "items": {
                                        "type": "string"
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "inbox": {
                              "type": "object",
                              "properties": {
                                "customSignature": {
                                  "type": "string"
                                }
                              }
                            },
                            "cleaningStatus": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "enum": [
                                    "clean",
                                    "waitingForInspection",
                                    "dirty",
                                    "unknown"
                                  ]
                                },
                                "updatedAt": {
                                  "type": "string",
                                  "example": "2019-08-24T14:15:22Z"
                                }
                              }
                            },
                            "paymentProcessing": {
                              "type": "object",
                              "properties": {
                                "active": {
                                  "type": "boolean"
                                },
                                "paymentProviders": {
                                  "type": "object",
                                  "properties": {
                                    "stripe": {
                                      "type": "object",
                                      "properties": {
                                        "active": {
                                          "type": "boolean"
                                        },
                                        "status": {
                                          "type": "string"
                                        },
                                        "accountName": {
                                          "type": "string"
                                        },
                                        "defaultCurrency": {
                                          "type": "string"
                                        },
                                        "syncedAt": {
                                          "type": "string",
                                          "format": "date"
                                        },
                                        "payload": {
                                          "type": "object",
                                          "properties": {
                                            "id": {
                                              "type": "string"
                                            },
                                            "livemode": {
                                              "type": "boolean"
                                            },
                                            "token_type": {
                                              "type": "string"
                                            },
                                            "stripe_publishable_key": {
                                              "type": "string"
                                            },
                                            "stripe_user_id": {
                                              "type": "string"
                                            },
                                            "scope": {
                                              "type": "string"
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "autoPayments": {
                              "type": "object",
                              "properties": {
                                "policy": {
                                  "type": "array"
                                }
                              }
                            }
                          }
                        },
                        "receptionistsService": {
                          "title": "object",
                          "properties": {
                            "receptionDesk": {
                              "type": "object",
                              "properties": {
                                "ittt": {
                                  "type": "array",
                                  "items": {}
                                }
                              }
                            },
                            "screening": {
                              "type": "object",
                              "properties": {
                                "checklist": {
                                  "type": "array",
                                  "items": {}
                                }
                              }
                            },
                            "contactPersonUserId": {
                              "type": "string"
                            }
                          }
                        },
                        "active": {
                          "type": "boolean"
                        },
                        "customFields": {
                          "type": "object"
                        },
                        "calendarRules": {
                          "type": "object"
                        },
                        "publicDescription": {
                          "type": "object"
                        },
                        "privateDescription": {
                          "type": "object"
                        },
                        "markups": {
                          "type": "object"
                        }
                      }
                    },
                    "owner": {
                      "type": "object",
                      "properties": {
                        "ownersPortalSettings": {
                          "type": "object",
                          "description": "The OPSettings object",
                          "properties": {
                            "bookedNights": {
                              "type": "boolean"
                            },
                            "revenue": {
                              "type": "boolean"
                            },
                            "accommodationFare": {
                              "type": "boolean"
                            },
                            "netAccommodationFare": {
                              "type": "boolean"
                            },
                            "netRentalIncome": {
                              "type": "boolean"
                            },
                            "guestsReports": {
                              "type": "boolean"
                            },
                            "guestsReportsViewId": {
                              "type": "string"
                            },
                            "occupancy": {
                              "type": "boolean"
                            },
                            "avgNightlyRate": {
                              "type": "boolean"
                            },
                            "revPal": {
                              "type": "boolean"
                            },
                            "hostPayout": {
                              "type": "boolean"
                            },
                            "nightlyRate": {
                              "type": "boolean"
                            },
                            "minNights": {
                              "type": "boolean"
                            },
                            "bookingSource": {
                              "type": "boolean"
                            },
                            "showReservationTooltips": {
                              "type": "boolean"
                            },
                            "showInternalNotesForBlocks": {
                              "type": "boolean"
                            },
                            "showNotesForCoOwnerReservations": {
                              "type": "boolean"
                            },
                            "showReservedReservations": {
                              "type": "boolean"
                            },
                            "showHelpCenter": {
                              "type": "boolean"
                            },
                            "showOwnerStatements": {
                              "type": "boolean"
                            },
                            "allowReservations": {
                              "type": "boolean"
                            },
                            "allowReservationsUnavailableDates": {
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
                            "showOverallGuestRating": {
                              "type": "boolean"
                            },
                            "showGuestReviews": {
                              "type": "boolean"
                            },
                            "inquiriesCount": {
                              "type": "boolean"
                            },
                            "averageBookingValue": {
                              "type": "boolean"
                            },
                            "averageGuestStay": {
                              "type": "boolean"
                            },
                            "ownerReservationRevenueLoss": {
                              "type": "boolean"
                            },
                            "ownerReservationBookedNights": {
                              "type": "boolean"
                            }
                          },
                          "example": {
                            "ownersPortalSettings": {
                              "bookedNights": true,
                              "revenue": true
                            }
                          }
                        },
                        "listings": {
                          "type": "array",
                          "description": "Listings Id",
                          "items": {
                            "type": "string"
                          },
                          "example": [
                            "5e32fc021690ba0026f6f778",
                            "5e32fc021690d15417543012",
                            "5e32fc021690d15417543013"
                          ]
                        },
                        "_id": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "locale": {
                          "type": "string",
                          "description": "Localization",
                          "example": "en-US"
                        },
                        "active": {
                          "type": "boolean",
                          "example": "false"
                        },
                        "allowReservations": {
                          "type": "boolean",
                          "example": "false",
                          "description": "Deprecated. Use ownersPortalSettings.allowReservations"
                        },
                        "showReservationTooltips": {
                          "type": "boolean",
                          "example": "false",
                          "description": "Deprecated. Use ownersPortalSettings.showReservationTooltips"
                        },
                        "businessInformation": {
                          "type": "object",
                          "properties": {
                            "businessType": {
                              "type": "object",
                              "properties": {
                                "type": {
                                  "type": "string"
                                },
                                "other": {
                                  "type": "string"
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
                            "vatIdentificationNumber": {
                              "type": "string"
                            },
                            "vatRate": {
                              "type": "number",
                              "description": "Range between 0 - 100"
                            },
                            "ownerCommission": {
                              "type": "number",
                              "description": "Range between 0 - 100"
                            }
                          }
                        },
                        "birthday": {
                          "type": "string",
                          "description": "Date"
                        },
                        "anniversary": {
                          "type": "string",
                          "description": "Date"
                        },
                        "workingCapital": {
                          "description": "Deprecated",
                          "type": "number",
                          "example": 0
                        },
                        "firstName": {
                          "type": "string",
                          "example": "Elad"
                        },
                        "lastName": {
                          "type": "string",
                          "example": "Kremer"
                        },
                        "fullName": {
                          "type": "string",
                          "example": "Elad Kremer"
                        },
                        "email": {
                          "type": "string",
                          "example": "example@guesty.com",
                          "description": "Primary email address"
                        },
                        "address": {
                          "type": "string",
                          "example": "test address"
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
                          "type": "string",
                          "example": "15417543010",
                          "description": "Primary phone number"
                        },
                        "picture": {
                          "type": "object",
                          "properties": {
                            "thumbnail": {
                              "type": "string"
                            },
                            "regular": {
                              "type": "string"
                            },
                            "large": {
                              "type": "string"
                            }
                          },
                          "example": {
                            "thumbnail": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx",
                            "large": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx"
                          }
                        },
                        "notes": {
                          "type": "string",
                          "example": "this is a note"
                        },
                        "createdAt": {
                          "type": "string",
                          "description": "date ISO",
                          "example": "2020-03-13T12:17:06.758Z"
                        }
                      }
                    },
                    "nightsCount": {
                      "type": "number"
                    },
                    "id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string"
                        },
                        "message": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "required": [
                    "error"
                  ],
                  "example": {
                    "error": {
                      "code": "UNAUTHORIZED",
                      "message": "Unauthorized"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Unhandled exception. Something went wrong on server.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Internal Server Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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
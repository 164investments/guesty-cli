# Retrieve all listings

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
      "name": "Listings"
    }
  ],
  "paths": {
    "/listings": {
      "get": {
        "tags": [
          "Listings"
        ],
        "summary": "Retrieve all listings",
        "parameters": [
          {
            "in": "query",
            "name": "ids",
            "description": "Limit results to these ids, comma separated",
            "schema": {
              "type": "string",
              "example": "3847fh87hs78n79f3,fj78fh78fbw7yyhdfyb"
            }
          },
          {
            "in": "query",
            "name": "nids",
            "description": "Limit results to not include these ids, comma seperated",
            "schema": {
              "type": "string",
              "example": "3847fh87hs78n79f3,fj78fh78fbw7yyhdfyb"
            }
          },
          {
            "in": "query",
            "name": "viewId",
            "description": "Pull a specific view (view is a saved settings of accountId, filters, fields,sort)",
            "schema": {
              "type": "string",
              "example": "Cozy luxurious"
            }
          },
          {
            "in": "query",
            "name": "q",
            "description": "Search query string. Searches in title, internalNote, address.full",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "city",
            "description": "Limit results to city",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "active",
            "description": "Limit results to active state. Boolean, true for only active, false for only inactive, don't include for all.",
            "schema": {
              "type": "boolean",
              "default": true
            }
          },
          {
            "in": "query",
            "name": "pmsActive",
            "description": "Limit results to listings with the feature pms active. Boolean, true for only active, false for only inactive, don't include for all.",
            "schema": {
              "type": "boolean",
              "default": true
            }
          },
          {
            "in": "query",
            "name": "integrationId",
            "description": "Limit results to specific integration",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "listed",
            "description": "Limit results to listed state. Boolean, true for only listed, false for only unlisted, don't include for all.",
            "schema": {
              "type": "boolean",
              "default": true
            }
          },
          {
            "in": "query",
            "name": "available",
            "description": "Limit results to only available listings in specific dates\n\n **IMPORTANT NOTE:**\n Fields in this query must be enclosed in curly braces as shown below, and NOT as displayed in the coding playground output.\n `available = {\"checkIn\":\"YYYY-MM-DD\",\"checkOut\":\"YYYY-MM-DD\",\"minOccupancy\":3}`",
            "schema": {
              "type": "object",
              "properties": {
                "checkIn": {
                  "type": "string",
                  "example": "2022-12-27"
                },
                "checkOut": {
                  "type": "string",
                  "example": "2022-12-29"
                },
                "minOccupancy": {
                  "type": "number",
                  "example": 3
                }
              }
            }
          },
          {
            "in": "query",
            "name": "ignoreFlexibleBlocks",
            "description": "Shows available listings and listings with flexible blocks.",
            "schema": {
              "type": "boolean",
              "default": false
            }
          },
          {
            "in": "query",
            "name": "tags",
            "description": "Limit results to listings with specific tag",
            "schema": {
              "type": "string",
              "example": "tags=kinesu"
            }
          },
          {
            "in": "query",
            "name": "fields",
            "description": "Selection of fields, separated by space",
            "schema": {
              "type": "string",
              "example": "title address"
            }
          },
          {
            "in": "query",
            "name": "sort",
            "description": "ascending alphabetical sort , use - to descending sort",
            "schema": {
              "type": "string",
              "default": "title",
              "example": "title/-title"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "description": "Pagination, max: 100",
            "schema": {
              "type": "number",
              "default": 25
            }
          },
          {
            "in": "query",
            "name": "skip",
            "description": "Pagination skip",
            "schema": {
              "type": "number",
              "default": 0
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Listings Array",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
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
                  }
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
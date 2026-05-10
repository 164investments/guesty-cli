# Create a listing

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
      "post": {
        "tags": [
          "Listings"
        ],
        "summary": "Create a listing",
        "requestBody": {
          "description": "Any full address will do, we advise using the full property (the data will be parsed to the rest of the fields). PMS is automatically ON for this listing.",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
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
                  "title": {
                    "type": "string",
                    "example": "Example listing title"
                  },
                  "origin": {
                    "type": "string",
                    "example": "company_name",
                    "description": "Marks the origin platform that the listing was migrated from"
                  },
                  "originId": {
                    "type": "string",
                    "example": "67890234",
                    "description": "Marks the origin platform listing ID"
                  },
                  "accommodates": {
                    "type": "number",
                    "default": 2
                  },
                  "bathrooms": {
                    "type": "number",
                    "description": "Starting March 4th 2025, the bathroom field will be deprecated. Please use the Spaces endpoints to add and manage bathroom details moving forward.",
                    "deprecated": true
                  },
                  "minimumAge": {
                    "type": "number"
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
                    },
                    "default": {
                      "minNights": 1,
                      "maxNights": 45
                    }
                  },
                  "timezone": {
                    "type": "string",
                    "default": "Asia/Jerusalem"
                  },
                  "propertyType": {
                    "type": "string",
                    "description": "Describes the kind of property where your guest will stay (e.g., Apartment, House, Villa, Boat, Tent, etc.).\nCorresponds to the Property type in the UI",
                    "enum": [
                      "Aparthotel",
                      "Apartment",
                      "Barn",
                      "Bed & Breakfast",
                      "Boat",
                      "Boutique hotel",
                      "Bungalow",
                      "Cabin",
                      "Camper/RV",
                      "Casa particular (Cuba)",
                      "Castle",
                      "Cave",
                      "Chalet",
                      "Condominium",
                      "Cottage",
                      "Cycladic house (Greece)",
                      "Dammuso",
                      "Dome house",
                      "Dorm",
                      "Earth house",
                      "Farm stay",
                      "Guest suite",
                      "Guesthouse",
                      "Heritage hotel (India)",
                      "Holiday home",
                      "Hostel",
                      "Hotel",
                      "House",
                      "Houseboat",
                      "Hut",
                      "Igloo",
                      "In-law",
                      "Inn",
                      "Island",
                      "Lighthouse",
                      "Loft",
                      "Minsu",
                      "Nature lodge",
                      "Other",
                      "Parking Space",
                      "Pension (South Korea)",
                      "Plane",
                      "Resort",
                      "Rv",
                      "Ryokan (Japan)",
                      "Serviced apartment",
                      "Shepherds hut",
                      "Studio",
                      "Tent",
                      "Timeshare",
                      "Tiny house",
                      "Tipi",
                      "Townhouse",
                      "Train",
                      "Treehouse",
                      "Trullo (Italy)",
                      "Vacation home",
                      "Villa",
                      "Windmill",
                      "Yurt"
                    ]
                  },
                  "roomType": {
                    "type": "string",
                    "description": "Indicates the level of privacy your guest will have during their stay (e.g., Entire home/apt, Private room, or Shared room).\nCorresponds to the Listing type in the UI",
                    "enum": [
                      "Entire home/apt",
                      "Private room",
                      "Shared room"
                    ]
                  },
                  "otaRoomType": {
                    "type": "string",
                    "description": "A Booking.com-specific field that defines either the property type or room capacity, depending on whether the stay is in a full unit or a single-room setup (e.g., Suite, Double, Villa, Bed in dormitory).\nCorresponds to the Room type in the UI",
                    "enum": [
                      "Apartment",
                      "Bed in dormitory",
                      "Bungalow",
                      "Chalet",
                      "Dormitory room",
                      "Double",
                      "Family",
                      "Holiday home",
                      "Mobile home",
                      "Quadruple",
                      "Single",
                      "Studio",
                      "Suite",
                      "Tent",
                      "Triple",
                      "Twin",
                      "Villa"
                    ]
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
                  "defaultCheckInTime": {
                    "type": "string",
                    "default": "15:00"
                  },
                  "defaultCheckOutTime": {
                    "type": "string",
                    "default": "10:00"
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "SINGLE",
                      "MTL"
                    ],
                    "description": "Listing type"
                  },
                  "tags": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
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
                  "owners": {
                    "type": "array",
                    "items": {
                      "oneOf": [
                        {
                          "type": "string",
                          "description": "MongoDB ID"
                        },
                        {
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "string",
                              "description": "MongoDB ID"
                            }
                          },
                          "required": [
                            "_id"
                          ]
                        }
                      ]
                    },
                    "description": "The owner should be an ID, not just a string ",
                    "default": []
                  },
                  "nickname": {
                    "type": "string",
                    "description": "Listing nickname"
                  },
                  "amenities": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "mtl": {
                    "description": "In case if you are going to create a listing with the child unit, please fill in 'mtl' object",
                    "type": "object",
                    "properties": {
                      "aas": {
                        "type": "string",
                        "example": "bc",
                        "description": "Can be one of the following: 'oc'(on create), 'm'(manual), 'bc'(before check-in)"
                      },
                      "aao": {
                        "type": "string",
                        "example": "f",
                        "nullable": true,
                        "description": "Define the automatic assignment rules for the selected multi unit. Note that it is not relevant for listings that have manual assignment logic (aas: 'm'). Can be one of the following: 'f'(first free by unit's nickname), 'r'(randomly)"
                      },
                      "bc": {
                        "type": "number",
                        "nullable": true,
                        "description": "Number of days before check-in"
                      },
                      "c": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        },
                        "nullable": true,
                        "description": "Array with children ids"
                      },
                      "p": {
                        "type": "string",
                        "nullable": true,
                        "description": "Parent id"
                      },
                      "hdb4": {
                        "type": "number",
                        "nullable": true,
                        "description": "Highlighting days before"
                      },
                      "lmcn": {
                        "type": "boolean",
                        "nullable": true,
                        "description": "True if the availability should be calculated according to max consecutive nights. Otherwise it will be calculated according to the number of vacant sub-unit"
                      }
                    }
                  },
                  "manageSubunitPictures": {
                    "type": "boolean"
                  },
                  "isListed": {
                    "type": "boolean"
                  },
                  "numberOfChildrenToCreate": {
                    "type": "number"
                  }
                },
                "required": [
                  "address",
                  "title",
                  "prices",
                  "pictures",
                  "type",
                  "nickname",
                  "terms"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Listing",
            "content": {
              "application/json": {
                "schema": {
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
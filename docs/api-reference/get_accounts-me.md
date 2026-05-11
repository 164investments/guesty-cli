# Get account details of current user.

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
      "name": "Accounts"
    }
  ],
  "paths": {
    "/accounts/me": {
      "get": {
        "tags": [
          "Accounts"
        ],
        "summary": "Get account details of current user.",
        "responses": {
          "200": {
            "description": "Retrieved account details.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string"
                    },
                    "active": {
                      "type": "boolean",
                      "description": "Status of connection"
                    },
                    "name": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string",
                      "format": "email"
                    },
                    "timezone": {
                      "type": "string"
                    },
                    "mailgun": {
                      "type": "object",
                      "properties": {}
                    },
                    "isInterestedInServiceOnExistingReservations": {
                      "type": "boolean"
                    },
                    "siqnupQuestions": {
                      "type": "object",
                      "properties": {}
                    },
                    "ignoredHooks": {
                      "type": "array",
                      "items": {
                        "type": "string",
                        "example": "5981b4b8c97c260f0067c499"
                      }
                    },
                    "initialLocation": {
                      "type": "string"
                    },
                    "recognizedRevenueDays": {
                      "type": "number"
                    },
                    "initialReferrer": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "question": {
                          "type": "string"
                        },
                        "answer": {
                          "type": "string"
                        }
                      }
                    },
                    "mailingAddress": {
                      "type": "object",
                      "properties": {
                        "lat": {
                          "type": "number"
                        },
                        "lng": {
                          "type": "number"
                        },
                        "full": {
                          "type": "string"
                        }
                      }
                    },
                    "sisenseAccess": {
                      "type": "boolean"
                    },
                    "recognizedRevenueMode": {
                      "type": "string",
                      "enum": [
                        "check-in",
                        "check-out",
                        "per_night"
                      ]
                    },
                    "companyInformation": {
                      "type": "object",
                      "properties": {
                        "_id": {
                          "type": "string"
                        },
                        "name": {
                          "type": "string"
                        },
                        "contactFirstname": {
                          "type": "string"
                        },
                        "contactLastname": {
                          "type": "string"
                        },
                        "contactEmail": {
                          "type": "string",
                          "format": "email"
                        },
                        "contactPhone": {
                          "type": "string"
                        },
                        "businessType": {
                          "type": "string"
                        },
                        "vatNum": {
                          "type": "number"
                        },
                        "country": {
                          "type": "string"
                        },
                        "address": {
                          "type": "string"
                        },
                        "city": {
                          "type": "string"
                        },
                        "zipCode": {
                          "type": "string"
                        },
                        "corporationPlace": {
                          "type": "string"
                        },
                        "submittedAt": {
                          "type": "string",
                          "format": "date"
                        }
                      }
                    },
                    "createdAt": {
                      "type": "string",
                      "format": "date"
                    },
                    "RUFeeActivation": {
                      "type": "boolean"
                    },
                    "currency": {
                      "type": "string"
                    },
                    "companyLogo": {
                      "type": "string"
                    },
                    "accountCategorization": {
                      "type": "number"
                    },
                    "accountCategorizationIsManual": {
                      "type": "boolean"
                    },
                    "agodaEmail": {
                      "type": "string",
                      "format": "email"
                    },
                    "onBoarding": {
                      "type": "object",
                      "properties": {
                        "createdFirstHookAt": {
                          "type": "string",
                          "format": "date"
                        },
                        "zendeskTicketId": {
                          "type": "string"
                        }
                      }
                    },
                    "migration": {
                      "type": "object",
                      "properties": {
                        "rateStrategy": {
                          "type": "string",
                          "format": "date"
                        }
                      }
                    },
                    "pricePlanMinimum": {
                      "type": "number"
                    },
                    "pricePlanMaximum": {
                      "type": "number"
                    },
                    "SaaS": {
                      "type": "object",
                      "properties": {}
                    },
                    "billing": {
                      "type": "object",
                      "properties": {
                        "billingCycle": {
                          "type": "string"
                        },
                        "billingDay": {
                          "type": "number"
                        },
                        "nextBillingDate": {
                          "type": "string",
                          "format": "date"
                        },
                        "paymentMethods": {
                          "type": "array",
                          "items": {}
                        },
                        "noFreezingFlow": {
                          "type": "boolean"
                        },
                        "stripeCustomerId": {
                          "type": "string"
                        }
                      }
                    },
                    "weekendBasePriceMigrationDone": {
                      "type": "boolean"
                    },
                    "pms": {
                      "type": "object",
                      "properties": {
                        "website": {
                          "type": "object",
                          "properties": {
                            "defaultStatusForNewReservations": {
                              "type": "string"
                            },
                            "defaultSort": {
                              "type": "string"
                            },
                            "includedListings": {
                              "type": "array",
                              "items": {}
                            },
                            "excludedListings": {
                              "type": "array",
                              "items": {}
                            }
                          }
                        },
                        "calendar": {
                          "type": "object",
                          "properties": {
                            "requireReasonForUpdatingPricing": {
                              "type": "boolean"
                            }
                          }
                        },
                        "cleaningStatus": {
                          "type": "object",
                          "properties": {
                            "statusFade": {
                              "type": "object",
                              "properties": {
                                "active": {
                                  "type": "boolean"
                                },
                                "days": {
                                  "type": "number"
                                },
                                "toStatus": {
                                  "type": "string"
                                }
                              }
                            },
                            "markAsDirtyOnCheckIn": {
                              "type": "boolean"
                            }
                          }
                        }
                      }
                    },
                    "whiteLabel": {
                      "type": "object",
                      "properties": {
                        "integrationEmailDomains": {
                          "type": "array",
                          "items": {}
                        },
                        "shouldWhiteLabelApp": {
                          "type": "boolean"
                        }
                      }
                    },
                    "hadFirstBookingAt": {
                      "type": "string",
                      "format": "date"
                    },
                    "availablePhoneNumbers": {
                      "type": "array",
                      "items": {}
                    },
                    "customFields": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "displayName": {
                            "type": "string"
                          },
                          "isPublic": {
                            "type": "boolean"
                          },
                          "key": {
                            "type": "string"
                          },
                          "object": {
                            "type": "string",
                            "enum": [
                              "listing",
                              "reservation"
                            ]
                          },
                          "options": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "user",
                              "boolean",
                              "enum",
                              "longtext",
                              "date",
                              "text",
                              "time",
                              "contact",
                              "number"
                            ]
                          }
                        }
                      }
                    },
                    "plan": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "name": {
                            "type": "string"
                          },
                          "planType": {
                            "type": "string"
                          },
                          "value": {
                            "type": "number"
                          },
                          "isLocked": {
                            "type": "boolean"
                          }
                        }
                      }
                    },
                    "financials": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "channelCommission": {
                          "type": "object",
                          "properties": {
                            "rentalsUnited": {
                              "type": "object",
                              "properties": {
                                "bookingCom": {
                                  "type": "object",
                                  "properties": {
                                    "tax": {
                                      "type": "number"
                                    }
                                  }
                                },
                                "expedia": {
                                  "type": "object",
                                  "properties": {
                                    "commission": {
                                      "type": "object",
                                      "properties": {
                                        "value": {
                                          "type": "number"
                                        },
                                        "of": {
                                          "type": "array",
                                          "items": {
                                            "type": "string"
                                          }
                                        },
                                        "tax": {
                                          "type": "number"
                                        }
                                      }
                                    }
                                  }
                                },
                                "agoda": {
                                  "type": "object",
                                  "properties": {
                                    "commission": {
                                      "type": "object",
                                      "properties": {
                                        "value": {
                                          "type": "number"
                                        },
                                        "of": {
                                          "type": "array",
                                          "items": {
                                            "type": "string"
                                          }
                                        },
                                        "tax": {
                                          "type": "number"
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "bookingCom": {
                              "type": "object",
                              "properties": {
                                "tax": {
                                  "type": "number"
                                }
                              }
                            },
                            "homeaway2": {
                              "type": "object",
                              "properties": {
                                "commission": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "number"
                                    },
                                    "of": {
                                      "type": "array",
                                      "items": {
                                        "type": "string"
                                      }
                                    },
                                    "tax": {
                                      "type": "number"
                                    }
                                  }
                                }
                              }
                            },
                            "useAccountSettings": {
                              "type": "boolean"
                            }
                          }
                        }
                      }
                    },
                    "commissionFormula": {
                      "type": "string"
                    },
                    "netIncomeFormula": {
                      "type": "string"
                    },
                    "ownerRevenueFormula": {
                      "type": "string"
                    },
                    "cancellationSurvey": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "date": {
                            "type": "string",
                            "format": "date"
                          },
                          "reasons": {
                            "type": "object",
                            "properties": {
                              "Onboarding experience": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Missing features": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Technical issues": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "System usability": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Value for money": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Customer support": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Guest Communication Service": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              },
                              "Other": {
                                "type": "string",
                                "enum": [
                                  "hidden",
                                  "unselected",
                                  "selected"
                                ]
                              }
                            }
                          },
                          "subReasons": {
                            "type": "object",
                            "properties": {
                              "Other": {
                                "type": "object",
                                "properties": {
                                  "Other": {
                                    "type": "string",
                                    "enum": [
                                      "hidden",
                                      "unselected",
                                      "selected"
                                    ]
                                  },
                                  "OtherInput": {
                                    "type": "string"
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    "internalData": {
                      "type": "object",
                      "properties": {
                        "agreedToTOS": {
                          "type": "object",
                          "properties": {
                            "firstName": {
                              "type": "string"
                            },
                            "lastName": {
                              "type": "string"
                            },
                            "userEmail": {
                              "type": "string",
                              "format": "email"
                            },
                            "date": {
                              "type": "string",
                              "format": "email"
                            }
                          }
                        },
                        "features": {
                          "type": "object",
                          "properties": {
                            "airbnbIntegration": {
                              "type": "string"
                            }
                          }
                        },
                        "oldOnboardingStatus": {
                          "type": "string"
                        },
                        "accountManager": {
                          "type": "string"
                        },
                        "onboardingStatus": {
                          "type": "string"
                        }
                      }
                    },
                    "taxes": {
                      "type": "array",
                      "items": {
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
                          },
                          "units": {
                            "type": "string"
                          },
                          "quantifier": {
                            "type": "string"
                          },
                          "amount": {
                            "type": "number"
                          }
                        }
                      }
                    },
                    "commissionTaxPercentage": {
                      "type": "number"
                    },
                    "systemEmailsRecipients": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "markups": {
                      "type": "object",
                      "properties": {
                        "agoda": {
                          "type": "object",
                          "properties": {
                            "amount": {
                              "type": "number"
                            },
                            "units": {
                              "type": "string"
                            },
                            "status": {
                              "type": "string"
                            }
                          }
                        }
                      }
                    },
                    "signupQuestions": {
                      "type": "array",
                      "items": {}
                    },
                    "receptionistsService": {
                      "type": "object",
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
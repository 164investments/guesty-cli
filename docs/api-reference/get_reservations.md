# Search reservations

Retrieve all reservations or a filtered subset of them.

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
      "name": "Reservations"
    }
  ],
  "paths": {
    "/reservations": {
      "get": {
        "tags": [
          "Reservations"
        ],
        "summary": "Search reservations",
        "description": "Retrieve all reservations or a filtered subset of them.",
        "parameters": [
          {
            "in": "query",
            "name": "viewId",
            "description": "View Id",
            "example": "5fa02fa358d2db673e17de4e",
            "schema": {
              "type": "string"
            }
          },
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
                    "example": "checkIn"
                  },
                  "operator": {
                    "type": "string",
                    "description": "Enhanced MongoDB comparison operator: $eq, $not, $contains, $notcontains, $gt, $lt, $between\n\n **IMPORTANT NOTE:**\n In order to use the $between operator please check the syntax of the example below:\n `[{\"field\":\"checkIn\", \"operator\":\"$between\",\"from\":\"2023-03-02T00:00:00%2B01:00\",\"to\":\"2023-03-02T23:59:59%2B01:00\"}]`",
                    "example": "$gt"
                  },
                  "value": {
                    "type": "string",
                    "description": "Value to filter by",
                    "example": "2025-09-10T12:49:44.616Z"
                  },
                  "context": {
                    "type": "string",
                    "description": "Optional preprocessing. Options are now, createdAt, confirmedAt, canceledAt, alteredAt. When given, the date in value is relative to the context.",
                    "default": null,
                    "example": "now"
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
            "description": "Selection of fields, separated by space",
            "example": "checkIn checkOut confirmationCode guest.fullname listing.title"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Sorting, default: `_id`",
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
            "schema": {
              "type": "integer"
            },
            "example": "100",
            "description": "Skip number of records. In case nothing provided so nothing will be skipped"
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
                    "integration": {
                      "type": "object",
                      "properties": {
                        "limitations": {
                          "type": "object",
                          "properties": {
                            "availableStatuses": {
                              "type": "array"
                            }
                          }
                        },
                        "bookingCom": {
                          "type": "object",
                          "properties": {
                            "invalidCreditCards": {
                              "type": "array"
                            },
                            "reports": {
                              "type": "array"
                            }
                          }
                        },
                        "_id": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "platform": {
                          "type": "string"
                        }
                      }
                    },
                    "guestyFeeDetails": {
                      "type": "object",
                      "properties": {
                        "commission": {
                          "type": "number"
                        },
                        "feeMinimum": {
                          "type": "number"
                        },
                        "fee": {
                          "type": "number"
                        },
                        "feeUsd": {
                          "type": "number"
                        },
                        "isMinimumFee": {
                          "type": "boolean"
                        },
                        "isMaximumFee": {
                          "type": "boolean"
                        },
                        "planItems": {
                          "type": "array"
                        }
                      }
                    },
                    "review": {
                      "type": "object",
                      "properties": {
                        "shouldReview": {
                          "type": "boolean"
                        }
                      }
                    },
                    "atTimeOfConfirmation": {
                      "type": "object",
                      "properties": {
                        "snapshotCreated": {
                          "type": "boolean"
                        },
                        "channelCommission": {
                          "type": "object",
                          "properties": {
                            "useAccountSettings": {
                              "type": "boolean"
                            },
                            "_id": {
                              "type": "string",
                              "description": "Unique Id",
                              "example": "563e0b6a08a2710e00057b82"
                            },
                            "manual": {
                              "type": "array"
                            }
                          }
                        },
                        "taxes": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "appliedOnFees": {
                                "type": "string"
                              },
                              "appliedByDefaultOnChannels": {
                                "type": "array"
                              },
                              "_id": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "name": {
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
                              },
                              "appliedToAllFees": {
                                "type": "boolean"
                              },
                              "type": {
                                "type": "string"
                              }
                            }
                          }
                        },
                        "monthlyPriceFactor": {
                          "type": "number"
                        },
                        "weeklyPriceFactor": {
                          "type": "number"
                        },
                        "useAccountRevenueShare": {
                          "type": "boolean"
                        }
                      }
                    },
                    "flag": {
                      "type": "boolean"
                    },
                    "accountingEnabled": {
                      "type": "boolean"
                    },
                    "isBMApplied": {
                      "type": "boolean"
                    },
                    "confirmedPreBookings": {
                      "type": "array"
                    },
                    "pulledByDailySync": {
                      "type": "boolean"
                    },
                    "manuallyCreated": {
                      "type": "boolean"
                    },
                    "_id": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "status": {
                      "type": "string"
                    },
                    "checkIn": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "checkOut": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "nightsCount": {
                      "type": "number"
                    },
                    "guestsCount": {
                      "type": "number"
                    },
                    "money": {
                      "type": "object",
                      "properties": {
                        "altered": {
                          "type": "boolean"
                        },
                        "invoiceItems": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "title": {
                                "type": "string"
                              },
                              "amount": {
                                "type": "number"
                              },
                              "currency": {
                                "type": "string"
                              },
                              "type": {
                                "type": "string"
                              },
                              "isLocked": {
                                "type": "boolean"
                              },
                              "isTax": {
                                "type": "boolean"
                              },
                              "normalType": {
                                "type": "string"
                              },
                              "isAutoAdditionalFee": {
                                "type": "boolean"
                              },
                              "secondIdentifier": {
                                "type": "string"
                              }
                            }
                          }
                        },
                        "payments": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "authenticationRequiredData": {
                                "type": "object",
                                "properties": {
                                  "lastAuthMsgSentDate": {
                                    "type": "string",
                                    "example": "2021-08-16T08:38:20.280Z"
                                  },
                                  "authenticationUrl": {
                                    "type": "string"
                                  }
                                }
                              },
                              "paymentMethodStatus": {
                                "type": "string"
                              },
                              "isAuthorizationHold": {
                                "type": "boolean"
                              },
                              "status": {
                                "type": "string"
                              },
                              "refunds": {
                                "type": "array"
                              },
                              "authorizationHoldCaptures": {
                                "type": "array"
                              },
                              "createdAt": {
                                "type": "string",
                                "example": "2021-08-16T08:38:20.280Z"
                              },
                              "attempts": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "createdAt": {
                                      "type": "string",
                                      "example": "2021-08-16T08:38:20.280Z"
                                    },
                                    "_id": {
                                      "type": "string",
                                      "description": "Unique Id",
                                      "example": "563e0b6a08a2710e00057b82"
                                    },
                                    "status": {
                                      "type": "string"
                                    },
                                    "error": {
                                      "type": "string"
                                    },
                                    "payload": {
                                      "type": "object",
                                      "properties": {
                                        "charge": {
                                          "type": "string"
                                        },
                                        "code": {
                                          "type": "string"
                                        },
                                        "decline_code": {
                                          "type": "string"
                                        },
                                        "doc_url": {
                                          "type": "string"
                                        },
                                        "message": {
                                          "type": "string"
                                        },
                                        "payment_intent": {
                                          "type": "object",
                                          "properties": {
                                            "id": {
                                              "type": "string",
                                              "description": "Unique Id",
                                              "example": "563e0b6a08a2710e00057b82"
                                            },
                                            "object": {
                                              "type": "string"
                                            },
                                            "amount": {
                                              "type": "number"
                                            },
                                            "amount_capturable": {
                                              "type": "number"
                                            },
                                            "amount_received": {
                                              "type": "number"
                                            },
                                            "application": {
                                              "type": "string"
                                            },
                                            "capture_method": {
                                              "type": "string"
                                            },
                                            "charges": {
                                              "type": "object",
                                              "properties": {
                                                "object": {
                                                  "type": "string"
                                                },
                                                "data": {
                                                  "type": "array",
                                                  "items": {
                                                    "type": "object",
                                                    "properties": {
                                                      "id": {
                                                        "type": "string"
                                                      },
                                                      "object": {
                                                        "type": "string"
                                                      },
                                                      "amount": {
                                                        "type": "number"
                                                      },
                                                      "amount_captured": {
                                                        "type": "number"
                                                      },
                                                      "amount_refunded": {
                                                        "type": "number"
                                                      },
                                                      "application": {
                                                        "type": "string"
                                                      },
                                                      "billing_details": {
                                                        "type": "object",
                                                        "properties": {
                                                          "address": {
                                                            "type": "object",
                                                            "properties": {
                                                              "city": {
                                                                "type": "string"
                                                              },
                                                              "country": {
                                                                "type": "string"
                                                              },
                                                              "line1": {
                                                                "type": "string"
                                                              },
                                                              "line2": {
                                                                "type": "string"
                                                              },
                                                              "postal_code": {
                                                                "type": "string"
                                                              },
                                                              "state": {
                                                                "type": "string"
                                                              }
                                                            }
                                                          },
                                                          "email": {
                                                            "type": "string"
                                                          },
                                                          "name": {
                                                            "type": "string"
                                                          },
                                                          "phone": {
                                                            "type": "string"
                                                          }
                                                        }
                                                      },
                                                      "calculated_statement_descriptor": {
                                                        "type": "string"
                                                      },
                                                      "captured": {
                                                        "type": "boolean"
                                                      },
                                                      "created": {
                                                        "type": "number"
                                                      },
                                                      "currency": {
                                                        "type": "string"
                                                      },
                                                      "customer": {
                                                        "type": "string"
                                                      },
                                                      "description": {
                                                        "type": "string"
                                                      },
                                                      "disputed": {
                                                        "type": "boolean"
                                                      },
                                                      "failure_code": {
                                                        "type": "string"
                                                      },
                                                      "failure_message": {
                                                        "type": "string"
                                                      },
                                                      "livemode": {
                                                        "type": "boolean"
                                                      },
                                                      "metadata": {
                                                        "type": "object",
                                                        "properties": {
                                                          "accountId": {
                                                            "type": "string",
                                                            "description": "Unique Id",
                                                            "example": "563e0b6a08a2710e00057b82"
                                                          },
                                                          "confirmationCode": {
                                                            "type": "string"
                                                          },
                                                          "reservationId": {
                                                            "type": "string",
                                                            "description": "Unique Id",
                                                            "example": "563e0b6a08a2710e00057b82"
                                                          },
                                                          "OTA": {
                                                            "type": "string"
                                                          },
                                                          "listingId": {
                                                            "type": "string",
                                                            "description": "Unique Id",
                                                            "example": "563e0b6a08a2710e00057b82"
                                                          }
                                                        }
                                                      },
                                                      "outcome": {
                                                        "type": "object",
                                                        "properties": {
                                                          "network_status": {
                                                            "type": "string"
                                                          },
                                                          "reason": {
                                                            "type": "string"
                                                          },
                                                          "risk_level": {
                                                            "type": "string"
                                                          },
                                                          "risk_score": {
                                                            "type": "number"
                                                          },
                                                          "seller_message": {
                                                            "type": "string"
                                                          },
                                                          "type": {
                                                            "type": "string"
                                                          }
                                                        }
                                                      },
                                                      "paid": {
                                                        "type": "boolean"
                                                      },
                                                      "payment_intent": {
                                                        "type": "string"
                                                      },
                                                      "payment_method": {
                                                        "type": "string"
                                                      },
                                                      "payment_method_details": {
                                                        "type": "object",
                                                        "properties": {
                                                          "card": {
                                                            "type": "object",
                                                            "properties": {
                                                              "brand": {
                                                                "type": "string"
                                                              },
                                                              "checks": {
                                                                "type": "object",
                                                                "properties": {
                                                                  "cvc_check": {
                                                                    "type": "string"
                                                                  }
                                                                }
                                                              },
                                                              "country": {
                                                                "type": "string"
                                                              },
                                                              "exp_month": {
                                                                "type": "number"
                                                              },
                                                              "exp_year": {
                                                                "type": "number"
                                                              },
                                                              "fingerprint": {
                                                                "type": "string"
                                                              },
                                                              "funding": {
                                                                "type": "string"
                                                              },
                                                              "last4": {
                                                                "type": "string"
                                                              },
                                                              "network": {
                                                                "type": "string"
                                                              }
                                                            }
                                                          },
                                                          "type": {
                                                            "type": "string"
                                                          }
                                                        }
                                                      },
                                                      "refunded": {
                                                        "type": "boolean"
                                                      },
                                                      "refunds": {
                                                        "type": "object",
                                                        "properties": {
                                                          "object": {
                                                            "type": "string"
                                                          },
                                                          "data": {
                                                            "type": "array"
                                                          },
                                                          "has_more": {
                                                            "type": "boolean"
                                                          },
                                                          "total_count": {
                                                            "type": "number"
                                                          },
                                                          "url": {
                                                            "type": "string"
                                                          }
                                                        }
                                                      },
                                                      "statement_descriptor": {
                                                        "type": "string"
                                                      },
                                                      "status": {
                                                        "type": "string"
                                                      }
                                                    }
                                                  }
                                                },
                                                "has_more": {
                                                  "type": "boolean"
                                                },
                                                "total_count": {
                                                  "type": "number"
                                                },
                                                "url": {
                                                  "type": "string"
                                                }
                                              }
                                            },
                                            "client_secret": {
                                              "type": "string"
                                            },
                                            "confirmation_method": {
                                              "type": "string"
                                            },
                                            "created": {
                                              "type": "number"
                                            },
                                            "currency": {
                                              "type": "string"
                                            },
                                            "customer": {
                                              "type": "string"
                                            },
                                            "description": {
                                              "type": "string"
                                            },
                                            "livemode": {
                                              "type": "boolean"
                                            },
                                            "metadata": {
                                              "type": "object",
                                              "properties": {
                                                "accountId": {
                                                  "type": "string",
                                                  "description": "Unique Id",
                                                  "example": "563e0b6a08a2710e00057b82"
                                                },
                                                "confirmationCode": {
                                                  "type": "string"
                                                },
                                                "reservationId": {
                                                  "type": "string",
                                                  "description": "Unique Id",
                                                  "example": "563e0b6a08a2710e00057b82"
                                                },
                                                "OTA": {
                                                  "type": "string"
                                                },
                                                "listingId": {
                                                  "type": "string",
                                                  "description": "Unique Id",
                                                  "example": "563e0b6a08a2710e00057b82"
                                                }
                                              }
                                            },
                                            "next_action": {
                                              "type": "object",
                                              "properties": {
                                                "type": {
                                                  "type": "string"
                                                },
                                                "use_stripe_sdk": {
                                                  "type": "object",
                                                  "properties": {
                                                    "type": {
                                                      "type": "string"
                                                    },
                                                    "merchant": {
                                                      "type": "string"
                                                    },
                                                    "three_d_secure_2_source": {
                                                      "type": "string"
                                                    },
                                                    "directory_server_name": {
                                                      "type": "string"
                                                    },
                                                    "server_transaction_id": {
                                                      "type": "string"
                                                    },
                                                    "three_ds_method_url": {
                                                      "type": "string"
                                                    },
                                                    "three_ds_optimizations": {
                                                      "type": "string"
                                                    },
                                                    "directory_server_encryption": {
                                                      "type": "object",
                                                      "properties": {
                                                        "directory_server_id": {
                                                          "type": "string"
                                                        },
                                                        "algorithm": {
                                                          "type": "string"
                                                        },
                                                        "certificate": {
                                                          "type": "string"
                                                        },
                                                        "root_certificate_authorities": {
                                                          "type": "array"
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            "payment_method": {
                                              "type": "string"
                                            },
                                            "payment_method_options": {
                                              "type": "object",
                                              "properties": {
                                                "card": {
                                                  "type": "object",
                                                  "properties": {
                                                    "request_three_d_secure": {
                                                      "type": "string"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            "payment_method_types": {
                                              "type": "array"
                                            },
                                            "statement_descriptor": {
                                              "type": "string"
                                            },
                                            "status": {
                                              "type": "string"
                                            }
                                          }
                                        },
                                        "payment_method": {
                                          "type": "object",
                                          "properties": {
                                            "id": {
                                              "type": "string"
                                            },
                                            "object": {
                                              "type": "string"
                                            },
                                            "billing_details": {
                                              "type": "object",
                                              "properties": {
                                                "address": {
                                                  "type": "object",
                                                  "properties": {
                                                    "city": {
                                                      "type": "string"
                                                    },
                                                    "country": {
                                                      "type": "string"
                                                    },
                                                    "line1": {
                                                      "type": "string"
                                                    },
                                                    "line2": {
                                                      "type": "string"
                                                    },
                                                    "postal_code": {
                                                      "type": "string"
                                                    },
                                                    "state": {
                                                      "type": "string"
                                                    }
                                                  }
                                                },
                                                "email": {
                                                  "type": "string"
                                                },
                                                "name": {
                                                  "type": "string"
                                                },
                                                "phone": {
                                                  "type": "string"
                                                }
                                              }
                                            },
                                            "card": {
                                              "type": "object",
                                              "properties": {
                                                "brand": {
                                                  "type": "string"
                                                },
                                                "checks": {
                                                  "type": "object",
                                                  "properties": {
                                                    "cvc_check": {
                                                      "type": "string"
                                                    }
                                                  }
                                                },
                                                "country": {
                                                  "type": "string"
                                                },
                                                "exp_month": {
                                                  "type": "number"
                                                },
                                                "exp_year": {
                                                  "type": "number"
                                                },
                                                "fingerprint": {
                                                  "type": "string"
                                                },
                                                "funding": {
                                                  "type": "string"
                                                },
                                                "last4": {
                                                  "type": "string"
                                                },
                                                "networks": {
                                                  "type": "object",
                                                  "properties": {
                                                    "available": {
                                                      "type": "array"
                                                    }
                                                  }
                                                },
                                                "three_d_secure_usage": {
                                                  "type": "object",
                                                  "properties": {
                                                    "supported": {
                                                      "type": "boolean"
                                                    }
                                                  }
                                                }
                                              }
                                            },
                                            "created": {
                                              "type": "number"
                                            },
                                            "customer": {
                                              "type": "string"
                                            },
                                            "livemode": {
                                              "type": "boolean"
                                            },
                                            "type": {
                                              "type": "string"
                                            }
                                          }
                                        },
                                        "type": {
                                          "type": "string"
                                        },
                                        "statusCode": {
                                          "type": "number"
                                        },
                                        "requestId": {
                                          "type": "string"
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              "receiptTargets": {
                                "type": "array"
                              },
                              "_id": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "amount": {
                                "type": "number"
                              },
                              "shouldBePaidAt": {
                                "type": "string",
                                "example": "2021-08-16T08:38:20.280Z"
                              },
                              "paymentMethodId": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "guestId": {
                                "type": "string",
                                "description": "Unique Id",
                                "example": "563e0b6a08a2710e00057b82"
                              },
                              "currency": {
                                "type": "string"
                              }
                            }
                          }
                        },
                        "autoPaymentsPolicy": {
                          "type": "array"
                        },
                        "currency": {
                          "type": "string"
                        },
                        "paymentProviderIds": {
                          "type": "array"
                        },
                        "fareAccommodationAdjustment": {
                          "type": "number"
                        },
                        "fareAccommodationDiscount": {
                          "type": "number"
                        },
                        "fareAccommodation": {
                          "type": "number"
                        },
                        "fareAccommodationAdjusted": {
                          "type": "number"
                        },
                        "fareCleaning": {
                          "type": "number"
                        },
                        "hostServiceFee": {
                          "type": "number"
                        },
                        "hostServiceFeeTax": {
                          "type": "number"
                        },
                        "hostServiceFeeIncTax": {
                          "type": "number"
                        },
                        "subTotalPrice": {
                          "type": "number"
                        },
                        "hostPayout": {
                          "type": "number"
                        },
                        "hostPayoutUsd": {
                          "type": "number"
                        },
                        "totalTaxes": {
                          "type": "number"
                        },
                        "totalRefunded": {
                          "type": "number"
                        },
                        "totalPaid": {
                          "type": "number"
                        },
                        "paymentsDue": {
                          "type": "number"
                        },
                        "balanceDue": {
                          "type": "number"
                        },
                        "isFullyPaid": {
                          "type": "boolean"
                        },
                        "useAccountRevenueShare": {
                          "type": "boolean"
                        },
                        "netIncomeFormula": {
                          "type": "string"
                        },
                        "netIncome": {
                          "type": "number"
                        },
                        "commissionFormula": {
                          "type": "string"
                        },
                        "commission": {
                          "type": "number"
                        },
                        "commissionTaxPercentage": {
                          "type": "number"
                        },
                        "commissionTax": {
                          "type": "number"
                        },
                        "commissionIncTax": {
                          "type": "number"
                        },
                        "ownerRevenueFormula": {
                          "type": "string"
                        },
                        "ownerRevenue": {
                          "type": "number"
                        },
                        "currencyConversionRateToAccount": {
                          "type": "number"
                        },
                        "isTouchedPayments": {
                          "type": "boolean"
                        }
                      }
                    },
                    "listingId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "checkInDateLocalized": {
                      "type": "string"
                    },
                    "checkOutDateLocalized": {
                      "type": "string"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "guestId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "source": {
                      "type": "string"
                    },
                    "confirmationCode": {
                      "type": "string"
                    },
                    "mtl": {
                      "type": "object",
                      "properties": {
                        "assigned": {
                          "type": "boolean"
                        },
                        "_id": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        }
                      }
                    },
                    "isReturningGuest": {
                      "type": "boolean"
                    },
                    "confirmedAt": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "importedAt": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "additionalFeesAtCreation": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "automationSources": {
                            "type": "array"
                          },
                          "_id": {
                            "type": "string",
                            "description": "Unique Id",
                            "example": "563e0b6a08a2710e00057b82"
                          },
                          "isPercentage": {
                            "type": "boolean"
                          },
                          "isAutomated": {
                            "type": "boolean"
                          },
                          "name": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string"
                          },
                          "value": {
                            "type": "number"
                          },
                          "accountId": {
                            "type": "string",
                            "description": "Unique Id",
                            "example": "563e0b6a08a2710e00057b82"
                          },
                          "multiplier": {
                            "type": "string"
                          },
                          "targetFee": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "createdAt": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "pendingTasks": {
                      "type": "array"
                    },
                    "customFields": {
                      "type": "array"
                    },
                    "lastUpdatedAt": {
                      "type": "string",
                      "example": "2021-08-17T07:00:00.000Z"
                    },
                    "__v": {
                      "type": "number"
                    },
                    "conversationId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "id": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "isMidStay": {
                      "type": "boolean"
                    },
                    "lastStayListingId": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "stay": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "checkInDateLocalized": {
                          "type": "string"
                        },
                        "checkOutDateLocalized": {
                          "type": "string"
                        },
                        "eta": {
                          "type": "string"
                        },
                        "etd": {
                          "type": "string"
                        },
                        "guestsCount": {
                          "type": "number"
                        },
                        "unitTypeId": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "unitId": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "ratePlanId": {
                          "type": "string"
                        },
                        "numberOfGuests": {
                          "type": "object",
                          "properties": {
                            "numberOfAdults": {
                              "type": "number"
                            },
                            "numberOfChildren": {
                              "type": "number"
                            },
                            "numberOfInfants": {
                              "type": "number"
                            },
                            "numberOfPets": {
                              "type": "number"
                            }
                          }
                        },
                        "earlyCheckIn": {
                          "type": "object",
                          "properties": {
                            "blockDay": {
                              "type": "boolean"
                            }
                          }
                        }
                      }
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
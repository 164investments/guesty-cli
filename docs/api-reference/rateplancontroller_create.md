# Create a Rate Plan

Creates a Rate Plan. 

 Currently in pilot, the Rate Plans API allows the creation and management of independent rate plans that are not visible or editable within the Guesty UI. This API is available exclusively for <a href="http://Booking.com">Booking.com</a>   and direct reservations. 

To participate in the pilot, customers should contact Guesty for an eligibility review and to receive detailed information on potential limitations and risks.

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
      "name": "Open Api Rate Plan CRUD v1"
    }
  ],
  "paths": {
    "/rm-rate-plans-ext/rate-plans": {
      "post": {
        "operationId": "RatePlanController_create",
        "summary": "Create a Rate Plan",
        "description": "Creates a Rate Plan. \n\n Currently in pilot, the Rate Plans API allows the creation and management of independent rate plans that are not visible or editable within the Guesty UI. This API is available exclusively for <a href=\"http://Booking.com\">Booking.com</a>   and direct reservations. \n\nTo participate in the pilot, customers should contact Guesty for an eligibility review and to receive detailed information on potential limitations and risks.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "description": "rate plan create dto",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Rate plan name.",
                    "example": "My RatePlan"
                  },
                  "description": {
                    "type": "string",
                    "description": "Describe the rate plan.",
                    "example": "Rate plan description."
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "independent"
                    ],
                    "description": "Rate plan type.",
                    "example": "independent"
                  },
                  "pricingModel": {
                    "nullable": true,
                    "enum": [
                      "nightly_rate"
                    ],
                    "type": "string",
                    "description": "The pricing model.",
                    "example": "nightly_rate"
                  },
                  "cancellationPolicy": {
                    "nullable": true,
                    "enum": [
                      "strict",
                      "strict_60",
                      "strict_90",
                      "super_strict",
                      "moderate",
                      "semi_moderate",
                      "semi_flexible",
                      "firm",
                      "flex",
                      "free",
                      "special",
                      "direct_reservation_long_stay"
                    ],
                    "type": "string",
                    "example": "strict",
                    "description": "The rate plan cancellation policy."
                  },
                  "cancellationFee": {
                    "nullable": true,
                    "enum": [
                      100,
                      50,
                      0
                    ],
                    "type": "number",
                    "example": 100,
                    "description": "The rate plan cancellation fee."
                  },
                  "channelSync": {
                    "default": [],
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "bookingCom",
                        "manual_reservations",
                        "booking_engine"
                      ]
                    },
                    "example": [
                      "bookingCom"
                    ],
                    "description": "The channel to which the rate plan applies."
                  },
                  "mealPlans": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "breakfast",
                        "lunch",
                        "dinner",
                        "all_inclusive"
                      ]
                    },
                    "example": [
                      "dinner",
                      "lunch"
                    ],
                    "description": "Rate plan meal plans."
                  },
                  "availabilityRules": {
                    "description": "Rate plan availability rules.n",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "advanceNotice": {
                            "type": "number",
                            "description": "advance notice",
                            "example": 1
                          },
                          "bookingWindow": {
                            "type": "number",
                            "description": "booking window",
                            "example": 3
                          }
                        }
                      }
                    ]
                  }
                },
                "required": [
                  "name",
                  "type"
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
                    "ratePlan": {
                      "description": "rate plan",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "string",
                              "example": "5fae51c4fdff570029b147e8",
                              "description": "id"
                            },
                            "accountId": {
                              "type": "string",
                              "example": "5213a2d206112710005d96ff",
                              "description": "account id"
                            },
                            "type": {
                              "type": "string",
                              "enum": [
                                "independent"
                              ],
                              "example": "independent",
                              "description": "type"
                            },
                            "name": {
                              "type": "string",
                              "example": "My rate plan",
                              "description": "name"
                            },
                            "description": {
                              "type": "string",
                              "example": "My rate plan description",
                              "description": "description"
                            },
                            "cancellationPolicy": {
                              "nullable": true,
                              "enum": [
                                "strict",
                                "strict_60",
                                "strict_90",
                                "super_strict",
                                "moderate",
                                "semi_moderate",
                                "semi_flexible",
                                "firm",
                                "flex",
                                "free"
                              ],
                              "type": "string",
                              "example": "firm",
                              "description": "cancellationPolicy"
                            },
                            "cancellationFee": {
                              "nullable": true,
                              "enum": [
                                "FIRST_NIGHT",
                                "50%_TOTAL_PRICE",
                                "TOTAL_PRICE",
                                100,
                                50,
                                0
                              ],
                              "type": "string",
                              "example": 50,
                              "description": "cancellationFee"
                            },
                            "mealPlans": {
                              "type": "array",
                              "items": {
                                "type": "number",
                                "enum": [
                                  [
                                    "breakfast",
                                    "lunch",
                                    "dinner",
                                    "all_inclusive"
                                  ]
                                ]
                              },
                              "example": [
                                "all_inclusive"
                              ],
                              "description": "mealPlans"
                            },
                            "availabilityRules": {
                              "example": {
                                "advanceNotice": 10,
                                "bookingWindow": 20
                              },
                              "description": "availabilityRules",
                              "allOf": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "advanceNotice": {
                                      "type": "number",
                                      "description": "advance notice",
                                      "example": 1
                                    },
                                    "bookingWindow": {
                                      "type": "number",
                                      "description": "booking window",
                                      "example": 3
                                    },
                                    "dateRange": {
                                      "description": "date range",
                                      "allOf": [
                                        {
                                          "type": "object",
                                          "properties": {
                                            "to": {
                                              "format": "date-time",
                                              "type": "string",
                                              "description": "to date"
                                            },
                                            "from": {
                                              "format": "date-time",
                                              "type": "string",
                                              "description": "from date"
                                            },
                                            "repeatedDays": {
                                              "description": "repeated days",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "0": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "1": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "2": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "3": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "4": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "5": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    },
                                                    "6": {
                                                      "type": "object",
                                                      "properties": {
                                                        "available": {
                                                          "type": "boolean",
                                                          "default": true
                                                        }
                                                      },
                                                      "required": [
                                                        "available"
                                                      ]
                                                    }
                                                  },
                                                  "required": [
                                                    "0",
                                                    "1",
                                                    "2",
                                                    "3",
                                                    "4",
                                                    "5",
                                                    "6"
                                                  ]
                                                }
                                              ]
                                            }
                                          },
                                          "required": [
                                            "to",
                                            "from",
                                            "repeatedDays"
                                          ]
                                        }
                                      ]
                                    },
                                    "restrictedDates": {
                                      "description": "restricted dates",
                                      "type": "array",
                                      "items": {
                                        "type": "string"
                                      }
                                    }
                                  }
                                }
                              ]
                            },
                            "pricingModel": {
                              "enum": [
                                "nightly_rate"
                              ],
                              "type": "string",
                              "example": "nightly_rate",
                              "description": "pricingModel"
                            },
                            "channelSync": {
                              "type": "array",
                              "items": {
                                "type": "string",
                                "enum": [
                                  "bookingCom",
                                  "manual_reservations",
                                  "booking_engine"
                                ]
                              },
                              "example": [
                                "bookingCom"
                              ],
                              "description": "channelSync"
                            },
                            "active": {
                              "type": "boolean",
                              "example": true,
                              "description": "is active"
                            },
                            "createdAt": {
                              "format": "date-time",
                              "type": "string",
                              "example": "2023-12-01T04:09:27.335Z",
                              "description": "createdAt"
                            },
                            "updatedAt": {
                              "format": "date-time",
                              "type": "string",
                              "example": "2023-12-01T04:09:27.335Z",
                              "description": "updatedAt"
                            }
                          },
                          "required": [
                            "_id",
                            "accountId",
                            "type",
                            "name",
                            "pricingModel",
                            "active",
                            "createdAt",
                            "updatedAt"
                          ]
                        }
                      ]
                    },
                    "requestId": {
                      "type": "string",
                      "description": "request id"
                    }
                  },
                  "required": [
                    "ratePlan",
                    "requestId"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "object",
                      "default": 400,
                      "enum": [
                        "CONTINUE",
                        "SWITCHING_PROTOCOLS",
                        "PROCESSING",
                        "EARLYHINTS",
                        "OK",
                        "CREATED",
                        "ACCEPTED",
                        "NON_AUTHORITATIVE_INFORMATION",
                        "NO_CONTENT",
                        "RESET_CONTENT",
                        "PARTIAL_CONTENT",
                        "AMBIGUOUS",
                        "MOVED_PERMANENTLY",
                        "FOUND",
                        "SEE_OTHER",
                        "NOT_MODIFIED",
                        "TEMPORARY_REDIRECT",
                        "PERMANENT_REDIRECT",
                        "BAD_REQUEST",
                        "UNAUTHORIZED",
                        "PAYMENT_REQUIRED",
                        "FORBIDDEN",
                        "NOT_FOUND",
                        "METHOD_NOT_ALLOWED",
                        "NOT_ACCEPTABLE",
                        "PROXY_AUTHENTICATION_REQUIRED",
                        "REQUEST_TIMEOUT",
                        "CONFLICT",
                        "GONE",
                        "LENGTH_REQUIRED",
                        "PRECONDITION_FAILED",
                        "PAYLOAD_TOO_LARGE",
                        "URI_TOO_LONG",
                        "UNSUPPORTED_MEDIA_TYPE",
                        "REQUESTED_RANGE_NOT_SATISFIABLE",
                        "EXPECTATION_FAILED",
                        "I_AM_A_TEAPOT",
                        "MISDIRECTED",
                        "UNPROCESSABLE_ENTITY",
                        "FAILED_DEPENDENCY",
                        "PRECONDITION_REQUIRED",
                        "TOO_MANY_REQUESTS",
                        "INTERNAL_SERVER_ERROR",
                        "NOT_IMPLEMENTED",
                        "BAD_GATEWAY",
                        "SERVICE_UNAVAILABLE",
                        "GATEWAY_TIMEOUT",
                        "HTTP_VERSION_NOT_SUPPORTED"
                      ],
                      "example": 400
                    },
                    "code": {
                      "type": "object",
                      "default": "VALIDATION_FAILED",
                      "example": "VALIDATION_FAILED"
                    },
                    "message": {
                      "type": "object",
                      "default": "Bad Request",
                      "example": "Bad Request"
                    },
                    "error": {
                      "default": {},
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "propertyName": {
                              "items": {
                                "type": "array"
                              },
                              "type": "array"
                            },
                            "property2Name": {
                              "type": "object",
                              "properties": {
                                "subPropertyName": {
                                  "items": {
                                    "type": "array"
                                  },
                                  "type": "array"
                                }
                              }
                            },
                            "property3Name": {
                              "nullable": true,
                              "example": [
                                null,
                                [
                                  "\"property3Name[1]\" does not match any of the allowed types"
                                ]
                              ],
                              "items": {
                                "type": "array"
                              },
                              "type": "array"
                            }
                          }
                        }
                      ]
                    }
                  },
                  "required": [
                    "status",
                    "code",
                    "message",
                    "error"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Client unauthorized"
          },
          "403": {
            "description": "Access is forbidden for this client"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "tags": [
          "Open Api Rate Plan CRUD v1"
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
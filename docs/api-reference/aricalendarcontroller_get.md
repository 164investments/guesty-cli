# GET Rate Plan Calendar

Retrieves the rate plan's rates, availability and inventory by calendar date.

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
      "name": "Open Api Ari Calendar v1"
    }
  ],
  "paths": {
    "/rm-rate-plans-ext/ari-calendar/listing/{listingId}/ratePlan/{ratePlanId}": {
      "get": {
        "operationId": "AriCalendarController_get",
        "summary": "GET Rate Plan Calendar",
        "description": "Retrieves the rate plan's rates, availability and inventory by calendar date.",
        "parameters": [
          {
            "name": "fromDate",
            "required": true,
            "in": "query",
            "example": "2022-11-21",
            "description": "Period start date.",
            "schema": {
              "format": "date-time",
              "type": "string"
            }
          },
          {
            "name": "toDate",
            "required": true,
            "in": "query",
            "example": "2022-11-28",
            "description": "Period end date.",
            "schema": {
              "format": "date-time",
              "type": "string"
            }
          },
          {
            "name": "ratePlanId",
            "required": true,
            "in": "path",
            "example": "62d7d58327dba40034e9670e",
            "description": "Rate plan ID.",
            "schema": {}
          },
          {
            "name": "listingId",
            "required": true,
            "in": "path",
            "example": "62d7d58327dba40034e9670e",
            "description": "Property ID.",
            "schema": {}
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ratePlan": {
                      "description": "rate plan id",
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
                    "days": {
                      "description": "calendar days",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "date": {
                            "type": "object",
                            "example": "2023-11-27",
                            "description": "day date"
                          },
                          "price": {
                            "type": "object",
                            "example": 250,
                            "description": "day price"
                          },
                          "minNights": {
                            "type": "number",
                            "example": 1,
                            "description": "day min nights"
                          },
                          "maxNights": {
                            "type": "number",
                            "example": 45,
                            "description": "day max nights"
                          },
                          "cta": {
                            "type": "boolean",
                            "example": false,
                            "description": "cta"
                          },
                          "ctd": {
                            "type": "boolean",
                            "example": false,
                            "description": "ctd"
                          },
                          "allotment": {
                            "type": "number",
                            "example": 3,
                            "description": "allotment"
                          },
                          "closed": {
                            "type": "boolean",
                            "example": false,
                            "description": "is day closed"
                          },
                          "createdAt": {
                            "format": "date-time",
                            "type": "string",
                            "example": "2023-11-27",
                            "description": "cteated at"
                          },
                          "updatedAt": {
                            "format": "date-time",
                            "type": "string",
                            "example": "2023-11-27",
                            "description": "udated at"
                          }
                        },
                        "required": [
                          "date",
                          "price"
                        ]
                      }
                    },
                    "listingId": {
                      "type": "string",
                      "description": "listing id"
                    },
                    "requestId": {
                      "type": "string",
                      "description": "request id"
                    }
                  },
                  "required": [
                    "ratePlan",
                    "days",
                    "listingId",
                    "requestId"
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
          "Open Api Ari Calendar v1"
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
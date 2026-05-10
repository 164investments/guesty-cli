# Get Rate Plans by Property

Retrieve rate plans by the listing ID. 

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
    "/rm-rate-plans-ext/rate-plans/listing/{listingId}": {
      "get": {
        "operationId": "RatePlanController_getByListing",
        "summary": "Get Rate Plans by Property",
        "description": "Retrieve rate plans by the listing ID. \n\n Currently in pilot, the Rate Plans API allows the creation and management of independent rate plans that are not visible or editable within the Guesty UI. This API is available exclusively for <a href=\"http://Booking.com\">Booking.com</a>   and direct reservations. \n\nTo participate in the pilot, customers should contact Guesty for an eligibility review and to receive detailed information on potential limitations and risks.",
        "parameters": [
          {
            "name": "listingId",
            "required": true,
            "in": "path",
            "description": "The property ID.",
            "example": "62d7d58327dba40034e9670e",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "skip",
            "required": true,
            "in": "query",
            "description": "The number of items to skip before starting to collect the result set.",
            "example": 1,
            "schema": {
              "default": 0,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": true,
            "in": "query",
            "description": "The numbers of items to return.",
            "example": 10,
            "schema": {
              "default": 25,
              "type": "number"
            }
          },
          {
            "name": "sort",
            "required": true,
            "in": "query",
            "example": "name",
            "description": "The field by which to sort the items returned. (link to list of filterable fields)",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "channelId",
            "required": true,
            "in": "query",
            "example": "bookingCom",
            "description": "The channel to which the rate plans apply.",
            "schema": {
              "enum": [
                "bookingCom",
                "manual_reservations",
                "booking_engine"
              ],
              "type": "string"
            }
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
                    "listingId": {
                      "type": "string",
                      "description": "Guesty property ID."
                    },
                    "ratePlans": {
                      "description": "Rate Plans List",
                      "type": "array",
                      "items": {
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
                    },
                    "requestId": {
                      "type": "string",
                      "description": "The request ID."
                    },
                    "count": {
                      "type": "number"
                    },
                    "limit": {
                      "type": "number"
                    },
                    "skip": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "listingId",
                    "ratePlans",
                    "requestId",
                    "count",
                    "limit",
                    "skip"
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
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "default": {
                        "code": "RATE_PLAN_NOT_FOUND",
                        "data": "RatePlan not found",
                        "message": "Not Found",
                        "status": 404
                      }
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
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
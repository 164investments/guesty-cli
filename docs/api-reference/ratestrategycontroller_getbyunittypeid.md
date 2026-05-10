# Retrieve Property's Rate Strategy.

Use this endpoint to retrieve the property's associated rate strategy settings.

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
      "name": "RateStrategyOpenApi"
    }
  ],
  "paths": {
    "/rm-rate-strategies-open-api/rate-strategies/unitType/{unitTypeId}": {
      "get": {
        "operationId": "RateStrategyController_getByUnitTypeId",
        "summary": "Retrieve Property's Rate Strategy.",
        "description": "Use this endpoint to retrieve the property's associated rate strategy settings.",
        "parameters": [
          {
            "name": "unitTypeId",
            "required": true,
            "in": "path",
            "description": "Unit type id.",
            "example": "63ee4b7e459ca31532fdfd232",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Rate strategy has been received.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "rateStrategy": {
                      "description": "Partial rate strategy information",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "object",
                              "description": "ID of the strategy",
                              "example": "5c07a535a9e7a8003cf0e43c"
                            },
                            "accountId": {
                              "type": "object",
                              "description": "Account ID",
                              "example": "5c07a535a9e7a8003cf0e43c"
                            },
                            "name": {
                              "type": "string",
                              "description": "Name of the strategy",
                              "example": "my rate strategy name"
                            },
                            "assignedListingCount": {
                              "type": "number",
                              "description": "Assigned listing count",
                              "example": 1
                            },
                            "rules": {
                              "description": "Rules for the strategy",
                              "allOf": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "seasonal": {
                                      "description": "Seasonal rules",
                                      "type": "array",
                                      "items": {
                                        "type": "object",
                                        "properties": {
                                          "_id": {
                                            "type": "object",
                                            "description": "ID of the seasonal",
                                            "example": "5c07a535a9e7a8003cf0e43c"
                                          },
                                          "name": {
                                            "type": "string",
                                            "description": "Name of the rule",
                                            "example": "event name"
                                          },
                                          "from": {
                                            "type": "object",
                                            "description": "Start date",
                                            "example": "2023-11-30"
                                          },
                                          "to": {
                                            "type": "object",
                                            "description": "End date",
                                            "example": "2023-12-01"
                                          },
                                          "restriction": {
                                            "description": "Restrictions",
                                            "allOf": [
                                              {
                                                "type": "object",
                                                "properties": {
                                                  "active": {
                                                    "type": "boolean",
                                                    "description": "Is the rule active?",
                                                    "example": false
                                                  },
                                                  "checkInWeekDays": {
                                                    "description": "Check-in weekdays",
                                                    "example": [
                                                      1,
                                                      3,
                                                      5
                                                    ],
                                                    "type": "array",
                                                    "items": {
                                                      "type": "number"
                                                    }
                                                  },
                                                  "checkOutWeekDays": {
                                                    "description": "Check-out weekdays",
                                                    "example": [
                                                      1,
                                                      3,
                                                      4,
                                                      5
                                                    ],
                                                    "type": "array",
                                                    "items": {
                                                      "type": "number"
                                                    }
                                                  }
                                                }
                                              }
                                            ]
                                          },
                                          "adjustmentPercentage": {
                                            "type": "number",
                                            "description": "Adjustment percentage",
                                            "example": 3
                                          },
                                          "minNights": {
                                            "type": "number",
                                            "description": "Minimum nights",
                                            "example": 1
                                          },
                                          "isAnnual": {
                                            "type": "boolean",
                                            "description": "Is it annual?",
                                            "example": false
                                          },
                                          "weekDays": {
                                            "description": "Weekdays",
                                            "example": [
                                              0,
                                              1,
                                              2,
                                              3,
                                              4,
                                              5,
                                              6
                                            ],
                                            "type": "array",
                                            "items": {
                                              "type": "number"
                                            }
                                          }
                                        }
                                      }
                                    },
                                    "events": {
                                      "description": "Events rules",
                                      "type": "array",
                                      "items": {
                                        "type": "object",
                                        "properties": {
                                          "_id": {
                                            "type": "object",
                                            "description": "ID of the events",
                                            "example": "5c07a535a9e7a8003cf0e43c"
                                          },
                                          "name": {
                                            "type": "string",
                                            "description": "Name of the rule",
                                            "example": "event name"
                                          },
                                          "from": {
                                            "type": "object",
                                            "description": "Start date",
                                            "example": "2023-11-30"
                                          },
                                          "to": {
                                            "type": "object",
                                            "description": "End date",
                                            "example": "2023-12-01"
                                          },
                                          "restriction": {
                                            "description": "Restrictions",
                                            "allOf": [
                                              {
                                                "type": "object",
                                                "properties": {
                                                  "active": {
                                                    "type": "boolean",
                                                    "description": "Is the rule active?",
                                                    "example": false
                                                  },
                                                  "checkInWeekDays": {
                                                    "description": "Check-in weekdays",
                                                    "example": [
                                                      1,
                                                      3,
                                                      5
                                                    ],
                                                    "type": "array",
                                                    "items": {
                                                      "type": "number"
                                                    }
                                                  },
                                                  "checkOutWeekDays": {
                                                    "description": "Check-out weekdays",
                                                    "example": [
                                                      1,
                                                      3,
                                                      4,
                                                      5
                                                    ],
                                                    "type": "array",
                                                    "items": {
                                                      "type": "number"
                                                    }
                                                  }
                                                }
                                              }
                                            ]
                                          },
                                          "adjustmentPercentage": {
                                            "type": "number",
                                            "description": "Adjustment percentage",
                                            "example": 3
                                          },
                                          "minNights": {
                                            "type": "number",
                                            "description": "Minimum nights",
                                            "example": 1
                                          },
                                          "isAnnual": {
                                            "type": "boolean",
                                            "description": "Is it annual?",
                                            "example": false
                                          }
                                        }
                                      }
                                    },
                                    "upcomingAvailability": {
                                      "description": "Upcoming availability rules",
                                      "type": "array",
                                      "items": {
                                        "type": "object",
                                        "properties": {
                                          "name": {
                                            "type": "string",
                                            "description": "Name of the rule",
                                            "example": "upcoming availability rule name"
                                          },
                                          "fromDays": {
                                            "type": "number",
                                            "description": "Starting days",
                                            "example": 1
                                          },
                                          "toDays": {
                                            "type": "number",
                                            "description": "Ending days",
                                            "example": 3
                                          },
                                          "weekDays": {
                                            "description": "Weekdays",
                                            "example": [
                                              1,
                                              2,
                                              3,
                                              5
                                            ],
                                            "type": "array",
                                            "items": {
                                              "type": "number"
                                            }
                                          },
                                          "adjustmentPercentage": {
                                            "type": "number",
                                            "description": "Adjustment percentage",
                                            "example": 3
                                          },
                                          "minNights": {
                                            "type": "number",
                                            "description": "Minimum nights",
                                            "example": 4
                                          }
                                        }
                                      }
                                    },
                                    "customizedGaps": {
                                      "description": "Customized gaps rules",
                                      "type": "array",
                                      "items": {
                                        "type": "object",
                                        "properties": {
                                          "_id": {
                                            "type": "object",
                                            "description": "ID of the customized gap",
                                            "example": "5c07a535a9e7a8003cf0e43c"
                                          },
                                          "name": {
                                            "type": "string",
                                            "description": "Name of the rule",
                                            "example": "gap rule name"
                                          },
                                          "fromDays": {
                                            "type": "number",
                                            "description": "Starting days",
                                            "example": 2
                                          },
                                          "toDays": {
                                            "type": "number",
                                            "description": "Ending days",
                                            "example": 5
                                          },
                                          "adjustmentPercentage": {
                                            "type": "number",
                                            "description": "Adjustment percentage",
                                            "example": 4
                                          },
                                          "maxGap": {
                                            "type": "number",
                                            "description": "Maximum gap",
                                            "example": 3
                                          }
                                        }
                                      }
                                    },
                                    "lengthOfStay": {
                                      "description": "Length of stay rules",
                                      "type": "array",
                                      "items": {
                                        "type": "object",
                                        "properties": {
                                          "_id": {
                                            "type": "object",
                                            "description": "ID of the length of stay",
                                            "example": "5c07a535a9e7a8003cf0e43c"
                                          },
                                          "length": {
                                            "description": "Length details",
                                            "allOf": [
                                              {
                                                "type": "object",
                                                "properties": {
                                                  "from": {
                                                    "type": "number",
                                                    "description": "Starting length",
                                                    "example": "2023-11-30"
                                                  },
                                                  "to": {
                                                    "type": "number",
                                                    "description": "Ending length",
                                                    "example": "2023-12-03"
                                                  }
                                                }
                                              }
                                            ]
                                          },
                                          "adjustmentPercentage": {
                                            "type": "number",
                                            "description": "Adjustment percentage",
                                            "example": 1
                                          },
                                          "type": {
                                            "enum": [
                                              "single",
                                              "range"
                                            ],
                                            "type": "string",
                                            "description": "Type of length",
                                            "example": "range"
                                          }
                                        }
                                      }
                                    },
                                    "repeatedDays": {
                                      "description": "Repeated days rules",
                                      "allOf": [
                                        {
                                          "type": "object",
                                          "properties": {
                                            "0": {
                                              "description": "Rule applied to Sundays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "1": {
                                              "description": "Rule applied to Mondays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "2": {
                                              "description": "Rule applied to Tuesdays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "3": {
                                              "description": "Rule applied to Wednesdays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "4": {
                                              "description": "Rule applied to Thursdays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "5": {
                                              "description": "Rule applied to Fridays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            },
                                            "6": {
                                              "description": "Rule applied to Saturdays",
                                              "allOf": [
                                                {
                                                  "type": "object",
                                                  "properties": {
                                                    "_id": {
                                                      "type": "object",
                                                      "description": "ID of the repeated day",
                                                      "example": "5c07a535a9e7a8003cf0e43c"
                                                    },
                                                    "adjustmentPercentage": {
                                                      "type": "number",
                                                      "description": "Adjustment percentage",
                                                      "example": 1
                                                    },
                                                    "minNights": {
                                                      "type": "number",
                                                      "description": "Minimum nights",
                                                      "example": 2
                                                    },
                                                    "cta": {
                                                      "type": "boolean",
                                                      "description": "CTA flag",
                                                      "example": false
                                                    },
                                                    "ctd": {
                                                      "type": "boolean",
                                                      "description": "CTD flag",
                                                      "example": true
                                                    }
                                                  }
                                                }
                                              ]
                                            }
                                          }
                                        }
                                      ]
                                    }
                                  }
                                }
                              ]
                            },
                            "description": {
                              "type": "string",
                              "description": "Description of the rate strategy",
                              "example": "rate strategy best description"
                            },
                            "singleUnitsCount": {
                              "type": "number",
                              "description": "Count of single units",
                              "example": 3
                            },
                            "multiUnitsCount": {
                              "type": "number",
                              "description": "Count of multiple units",
                              "example": 1
                            },
                            "subUnitsCount": {
                              "type": "number",
                              "description": "Count of sub-units",
                              "example": 4
                            },
                            "minAdjustmentPercentage": {
                              "type": "number",
                              "description": "Minimum adjustment percentage",
                              "example": 5
                            },
                            "maxAdjustmentPercentage": {
                              "type": "number",
                              "description": "Maximum adjustment percentage",
                              "example": 10
                            },
                            "minNights": {
                              "type": "number",
                              "description": "Minimum number of nights",
                              "example": 4
                            },
                            "isOptimized": {
                              "type": "boolean",
                              "description": "Is the rate strategy optimized?",
                              "example": true
                            },
                            "pendingSync": {
                              "type": "boolean",
                              "description": "Is the rate strategy pending for sync?",
                              "example": false
                            },
                            "createdAt": {
                              "type": "object",
                              "description": "Rate strategy creation date",
                              "example": "2023-12-19T07:53:09.567Z"
                            },
                            "updatedAt": {
                              "type": "object",
                              "description": "Rate strategy last update date",
                              "example": "2023-12-19T07:55:09.567Z"
                            }
                          }
                        }
                      ]
                    },
                    "unitTypeId": {
                      "type": "string",
                      "description": "ID of the unit type",
                      "example": "65814be58b41561467b95de9"
                    },
                    "requestId": {
                      "type": "string",
                      "description": "ID of the request",
                      "example": "65814be58b41561467b95de9"
                    }
                  },
                  "required": [
                    "rateStrategy",
                    "unitTypeId",
                    "requestId"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Validation error."
          },
          "401": {
            "description": "Сlient unauthorized."
          },
          "500": {
            "description": "Internal server error."
          }
        },
        "tags": [
          "RateStrategyOpenApi"
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
# Retrieve the optimized calendar for a single listing

Use this endpoint to retrieve daily calendar availability and pricing for a given listing ID and date range with optimized response format.

**View Parameter Behavior:**
- `view=compact` (default): Returns minimal data without `blockIds` array and detailed `blocks` object for better performance
- `view=full`: Returns complete data including `blockIds` array for each calendar day and detailed `blocks` object with full block information

IMPORTANT: Multi-unit calendar availability is determined by unit allotment, not its `status` field. To calculate if a multi-unit has availability, use the following formula:

```
const isAvailable = _.isNumber(currentDay.allotment)?
currentDay.allotment > 0 : currentDay.status === 'available';
```

# OpenAPI definition

````json
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
      "name": "Calendar"
    }
  ],
  "paths": {
    "/availability-pricing/api/calendar/listings/minified/{listingId}": {
      "get": {
        "tags": [
          "Calendar"
        ],
        "summary": "Retrieve the optimized calendar for a single listing",
        "description": "Use this endpoint to retrieve daily calendar availability and pricing for a given listing ID and date range with optimized response format.\n\n**View Parameter Behavior:**\n- `view=compact` (default): Returns minimal data without `blockIds` array and detailed `blocks` object for better performance\n- `view=full`: Returns complete data including `blockIds` array for each calendar day and detailed `blocks` object with full block information\n\nIMPORTANT: Multi-unit calendar availability is determined by unit allotment, not its `status` field. To calculate if a multi-unit has availability, use the following formula:\n\n```\nconst isAvailable = _.isNumber(currentDay.allotment)?\ncurrentDay.allotment > 0 : currentDay.status === 'available';\n```",
        "parameters": [
          {
            "in": "path",
            "name": "listingId",
            "description": "Listing ID",
            "example": "5fa02fa358d2db673e17bc2d",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "startDate",
            "description": "First day to be returned (format: YYYY-MM-DD)",
            "example": "2023-01-01",
            "required": true,
            "schema": {
              "type": "string",
              "format": "YYYY-MM-DD"
            }
          },
          {
            "in": "query",
            "name": "endDate",
            "description": "Last day to be returned (format: YYYY-MM-DD)",
            "example": "2023-02-01",
            "required": true,
            "schema": {
              "type": "string",
              "format": "YYYY-MM-DD"
            }
          },
          {
            "in": "query",
            "name": "includeAllotment",
            "description": "Return day objects including allotment",
            "example": "false",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          },
          {
            "in": "query",
            "name": "ignoreInactiveChildAllotment",
            "description": "Specify ignoreInactiveChildAllotment=true to exclude inactive sub-units from the allotment calculation. Default value is false.",
            "example": "false",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          },
          {
            "in": "query",
            "name": "ignoreUnlistedChildAllotment",
            "description": "Specify ignoreUnlistedChildAllotment=true to exclude unlisted sub-units from the allotment calculation. Default value is false.",
            "example": "false",
            "required": false,
            "schema": {
              "type": "boolean"
            }
          },
          {
            "in": "query",
            "name": "view",
            "description": "Calendar view type for optimized response",
            "example": "compact",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "compact",
                "full"
              ],
              "default": "compact"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Optimized calendar with available/unavailable dates. When view=compact, returns minimal data without blockIds and detailed blocks. When view=full, includes blockIds array and detailed blocks object. Returns only the data object containing the days information.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "days": {
                      "type": "object",
                      "properties": {
                        "listingId": {
                          "type": "string",
                          "example": "5d6e7a7ebf8e3800207735ad"
                        },
                        "startDate": {
                          "type": "string",
                          "description": "Start date with format YYYY-MM-DD"
                        },
                        "endDate": {
                          "type": "string",
                          "description": "End date with format YYYY-MM-DD"
                        },
                        "currency": {
                          "type": "string",
                          "description": "Listing's currency value."
                        },
                        "calendar": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "date": {
                                "type": "string",
                                "description": "Date with format YYYY-MM-DD"
                              },
                              "price": {
                                "type": "number",
                                "description": "Price in the listing's currency."
                              },
                              "minNights": {
                                "type": "number",
                                "description": "Min nights value."
                              },
                              "blocks": {
                                "type": "object",
                                "description": "Block information for the date. Only includes block types with true values."
                              },
                              "isBasePrice": {
                                "type": "boolean",
                                "description": "Flag which shows whether listing is set to base price."
                              },
                              "isBaseMinNights": {
                                "type": "boolean",
                                "description": "Flag which shows whether listing is set to base min night."
                              },
                              "requestToBook": {
                                "type": "boolean",
                                "description": "Request to book flag"
                              },
                              "cta": {
                                "type": "boolean",
                                "description": "Closed To Arrival value"
                              },
                              "ctd": {
                                "type": "boolean",
                                "description": "Closed To Departure value"
                              },
                              "blockIds": {
                                "type": "array",
                                "items": {
                                  "type": "string"
                                },
                                "description": "Array of block IDs for this date (only present when view=full)"
                              }
                            }
                          }
                        },
                        "blocks": {
                          "type": "object",
                          "description": "Detailed block information (only present when view=full)",
                          "additionalProperties": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "string"
                              },
                              "listingId": {
                                "type": "string"
                              },
                              "startDate": {
                                "type": "string"
                              },
                              "endDate": {
                                "type": "string"
                              },
                              "type": {
                                "type": "string"
                              },
                              "note": {
                                "type": "string"
                              },
                              "reservationId": {
                                "type": "string"
                              },
                              "reservation": {
                                "type": "object"
                              },
                              "createdAt": {
                                "type": "string"
                              },
                              "createdBy": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "days": {
                      "listingId": "687510715f4958000edfd6ba",
                      "startDate": "2025-08-29",
                      "endDate": "2025-09-10",
                      "currency": "USD",
                      "calendar": [
                        {
                          "date": "2025-08-29",
                          "price": 11,
                          "minNights": 1,
                          "blocks": {
                            "m": true
                          },
                          "isBasePrice": true,
                          "isBaseMinNights": true,
                          "requestToBook": false,
                          "cta": false,
                          "ctd": false
                        },
                        {
                          "date": "2025-08-30",
                          "price": 11,
                          "minNights": 1,
                          "blocks": {},
                          "isBasePrice": true,
                          "isBaseMinNights": true,
                          "requestToBook": false,
                          "cta": false,
                          "ctd": false
                        },
                        {
                          "date": "2025-09-02",
                          "price": 11,
                          "minNights": 1,
                          "blocks": {
                            "b": true
                          },
                          "isBasePrice": true,
                          "isBaseMinNights": true,
                          "requestToBook": false,
                          "cta": false,
                          "ctd": false
                        }
                      ],
                      "blocks": {
                        "68887c288e2fe15f60d7780b": {
                          "_id": "68887c288e2fe15f60d7780b",
                          "listingId": "687510715f4958000edfd6ba",
                          "startDate": "2025-08-28T00:00:00.000Z",
                          "endDate": "2025-08-29T00:00:00.000Z",
                          "type": "m",
                          "note": "test",
                          "createdAt": "2025-07-29T07:45:44.572Z",
                          "createdBy": "Test user"
                        },
                        "688b0ff5979306756a3d0f35": {
                          "_id": "688b0ff5979306756a3d0f35",
                          "listingId": "687510715f4958000edfd6ba",
                          "startDate": "2025-09-02T00:00:00.000Z",
                          "endDate": "2025-09-02T00:00:00.000Z",
                          "type": "b",
                          "reservationId": "688b0ff2d6befa642a6158ea",
                          "reservation": {
                            "_id": "688b0ff2d6befa642a6158ea",
                            "listingId": "687510715f4958000edfd6ba",
                            "status": "confirmed",
                            "confirmationCode": "GY-fPLihWYL",
                            "source": "manual",
                            "checkInDateLocalized": "2025-09-02",
                            "checkOutDateLocalized": "2025-09-03",
                            "money": {
                              "balanceDue": 30.7,
                              "currency": "USD",
                              "hostPayout": 30.7,
                              "totalPaid": 0
                            },
                            "nightsCount": 1,
                            "guestsCount": 1,
                            "guest": {
                              "_id": "688b0ff2098d648364433da5",
                              "fullName": "Test full name"
                            }
                          },
                          "createdAt": "2025-07-31T06:40:53.930Z",
                          "createdBy": "Test user"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Listing Not Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    },
                    "data": {
                      "type": "object"
                    },
                    "requestId": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "data",
                    "requestId"
                  ],
                  "example": {
                    "message": "Listing not found",
                    "code": "LISTING_NOT_FOUND",
                    "data": {
                      "listingId": "62e7c7a38200fa0031fc9e2e"
                    },
                    "requestId": "Root=1-63b68e3a-573cc83364fce31b0fd45abc"
                  }
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    },
                    "requestId": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "requestId"
                  ],
                  "example": {
                    "message": "child \"endDate\" fails because [\"endDate\" is required]",
                    "code": "ValidationError",
                    "details": [
                      {
                        "message": "\"endDate\" is required",
                        "path": [
                          "endDate"
                        ],
                        "type": "any.required",
                        "context": {
                          "key": "endDate",
                          "label": "endDate"
                        }
                      }
                    ],
                    "requestId": "Root=1-63b69790-624dc23b6c3abdaf7a0ce73d"
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
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "message"
                  ],
                  "example": {
                    "message": "Internal Server Error"
                  }
                }
              }
            }
          }
        }
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
````
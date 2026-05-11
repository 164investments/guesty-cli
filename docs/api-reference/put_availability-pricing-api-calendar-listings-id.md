# Update the calendar for a single listing

Set the nightly rate, minimum stay and availability of any calendar date per listing.

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
      "name": "Calendar"
    }
  ],
  "paths": {
    "/availability-pricing/api/calendar/listings/{id}": {
      "put": {
        "tags": [
          "Calendar"
        ],
        "summary": "Update the calendar for a single listing",
        "description": "Set the nightly rate, minimum stay and availability of any calendar date per listing.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Listing ID",
            "example": "5d6e7a7ebf8e3800207735ad",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "update calendar body",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "startDate",
                  "endDate"
                ],
                "properties": {
                  "startDate": {
                    "description": "First day affected by changes (format: YYYY-MM-DD)",
                    "type": "string",
                    "format": "YYYY-MM-DD",
                    "example": "2023-01-01"
                  },
                  "endDate": {
                    "description": "Last date affected by changes (format: YYYY-MM-DD)",
                    "type": "string",
                    "format": "YYYY-MM-DD",
                    "example": "2023-02-01"
                  },
                  "status": {
                    "description": "New status, enum: available, unavailable.",
                    "type": "string",
                    "enum": [
                      "available",
                      "unavailable"
                    ],
                    "example": "available"
                  },
                  "price": {
                    "description": "New price, in the listing's currency.",
                    "type": "number",
                    "example": "100"
                  },
                  "isBasePrice": {
                    "description": "Whether to reset prices for the range to the listing's base price",
                    "type": "boolean",
                    "example": "false"
                  },
                  "minNights": {
                    "description": "New min nights value",
                    "type": "integer",
                    "example": "3"
                  },
                  "isBaseMinNights": {
                    "description": "Whether to reset min nights for the range to the listing's base min nights",
                    "type": "boolean",
                    "example": "false"
                  },
                  "note": {
                    "description": "Note to add to those dates.",
                    "type": "string",
                    "example": "this is a note"
                  },
                  "cta": {
                    "description": "Set Closed To Arrival for the date range.",
                    "type": "boolean",
                    "example": "false"
                  },
                  "ctd": {
                    "description": "Set Closed To Departure for the date range.",
                    "type": "boolean",
                    "example": "false"
                  },
                  "useChildValues": {
                    "description": "Accept changes to minNights on sub-unit",
                    "type": "boolean",
                    "example": "false"
                  },
                  "blockReason": {
                    "description": "Reason for blocking, enum: Owner block, Offboarded, Migrated unit block, Maintenance, Onboarding, Emergency out of order, Do not sell, Deactivated, Other.",
                    "type": "string",
                    "enum": [
                      "Owner block",
                      "Offboarded",
                      "Migrated unit block",
                      "Maintenance",
                      "Onboarding",
                      "Emergency out of order",
                      "Do not sell",
                      "Deactivated",
                      "Other"
                    ],
                    "example": "Onboarding"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Returns ok if the update successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "ok"
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
```
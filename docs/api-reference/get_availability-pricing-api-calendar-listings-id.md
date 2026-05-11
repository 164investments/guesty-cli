# Retrieve the calendar for a single listing

Use this endpoint to retrieve daily calendar availability and pricing for a given listing ID and date range.

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
    "/availability-pricing/api/calendar/listings/{id}": {
      "get": {
        "tags": [
          "Calendar"
        ],
        "summary": "Retrieve the calendar for a single listing",
        "description": "Use this endpoint to retrieve daily calendar availability and pricing for a given listing ID and date range.\n\nIMPORTANT: Multi-unit calendar availability is determined by unit allotment, not its `status` field. To calculate if a multi-unit has availability, use the following formula:\n\n```\nconst isAvailable = _.isNumber(currentDay.allotment)?\ncurrentDay.allotment > 0 : currentDay.status === 'available';\n```",
        "parameters": [
          {
            "in": "path",
            "name": "id",
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
          }
        ],
        "responses": {
          "200": {
            "description": "Calendar with available/unavailable dates",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "date": {
                      "type": "string",
                      "description": "Date with format YYYY-MM-DD"
                    },
                    "listingId": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ad"
                    },
                    "currency": {
                      "type": "string",
                      "description": "Listing's currency value."
                    },
                    "price": {
                      "type": "number",
                      "description": "Price in the listing's currency."
                    },
                    "isBasePrice": {
                      "type": "boolean",
                      "description": "Flag which shows whether listing is set to base price."
                    },
                    "minNights": {
                      "type": "number",
                      "description": "Min nights value."
                    },
                    "isBaseMinNights": {
                      "type": "boolean",
                      "description": "Flag which shows whether listing is set to base min night."
                    },
                    "status": {
                      "type": "string",
                      "description": "Status value, enum: available, unavailable, booked, reserved."
                    },
                    "allotment": {
                      "type": "number",
                      "description": "Allotment value for parent listing."
                    },
                    "blocks": {
                      "type": "object"
                    },
                    "blockRefs": {
                      "type": "array",
                      "items": {
                        "type": "string",
                        "example": "5d6e7a7ebf8e3800207735ad"
                      }
                    },
                    "reservationId": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ad"
                    },
                    "reservation": {
                      "type": "object",
                      "example": "5d6e7a7ebf8e3800207735ad"
                    },
                    "cta": {
                      "type": "boolean",
                      "description": "Closed To Arrival value"
                    },
                    "ctd": {
                      "type": "boolean",
                      "description": "Closed To Departure value"
                    }
                  },
                  "example": {
                    "date": "2021-01-01",
                    "listingId": "5988346d3c31bf0f00747eb6",
                    "currency": "EUR",
                    "price": 50,
                    "isBasePrice": true,
                    "minNights": 2,
                    "isBaseMinNights": true,
                    "status": "booked",
                    "allotment": 0,
                    "blocks": {
                      "m": false,
                      "r": false,
                      "b": true,
                      "bd": false,
                      "sr": false,
                      "abl": false,
                      "a": false,
                      "bw": false,
                      "o": false,
                      "pt": false
                    },
                    "blockRefs": [
                      {
                        "_id": "5fe9c819a141ab0026c901c7",
                        "reservation": {
                          "listing": {
                            "timezone": "Asia/Jerusalem",
                            "defaultCheckInTime": "15:00"
                          },
                          "money": {
                            "currency": "EUR",
                            "hostPayout": 367.55,
                            "totalPaid": 0,
                            "balanceDue": 367.55
                          },
                          "guest": {
                            "_id": "5fe9c81834209c002c8ecd80"
                          },
                          "integration": {
                            "platform": "manual"
                          },
                          "_id": "5fe9c81934209c002c8ecd8b",
                          "status": "confirmed",
                          "checkIn": "2020-12-30T13:00:00.000Z",
                          "checkOut": "2021-01-02T08:00:00.000Z",
                          "nightsCount": 3,
                          "guestsCount": 2,
                          "listingId": "5988346d3c31bf0f00747eb6",
                          "checkInDateLocalized": "2020-12-30",
                          "checkOutDateLocalized": "2021-01-02",
                          "accountId": "596f6fe706112710005d96ff",
                          "guestId": "5fe9c81834209c002c8ecd80",
                          "source": "Manual",
                          "confirmationCode": "J86mAAAM2"
                        },
                        "listingId": "5988346d3c31bf0f00747eb6",
                        "startDate": "2020-12-30T00:00:00.000Z",
                        "endDate": "2021-01-01T00:00:00.000Z",
                        "type": "b",
                        "reservationId": "5fe9c81934209c002c8ecd8b"
                      }
                    ],
                    "reservationId": "5fe9c81934209c002c8ecd8b",
                    "reservation": {
                      "listing": {
                        "timezone": "Asia/Jerusalem",
                        "defaultCheckInTime": "15:00"
                      },
                      "money": {
                        "currency": "EUR",
                        "hostPayout": 367.55,
                        "totalPaid": 0,
                        "balanceDue": 367.55
                      },
                      "guest": {
                        "_id": "5fe9c81834209c002c8ecd80"
                      },
                      "integration": {
                        "platform": "manual"
                      },
                      "_id": "5fe9c81934209c002c8ecd8b",
                      "status": "confirmed",
                      "checkIn": "2020-12-30T13:00:00.000Z",
                      "checkOut": "2021-01-02T08:00:00.000Z",
                      "nightsCount": 3,
                      "guestsCount": 2,
                      "listingId": "5988346d3c31bf0f00747eb6",
                      "checkInDateLocalized": "2020-12-30",
                      "checkOutDateLocalized": "2021-01-02",
                      "accountId": "596f6fe706112710005d96ff",
                      "guestId": "5fe9c81834209c002c8ecd80",
                      "source": "Manual",
                      "confirmationCode": "J86mAAAM2"
                    },
                    "cta": false,
                    "ctd": false
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
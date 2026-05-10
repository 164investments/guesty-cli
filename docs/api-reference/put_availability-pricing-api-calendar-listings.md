# Update calendar for multiple listings

Use this endpoint to set availability and pricing for multiple listings across a range of dates.

IMPORTANT:
- It is strongly suggested updating a single unique listing ID in a single HTTP request, despite the fact the API does support receiving different listing IDs.
- Max allowed days to be updated - 730 (~2 years)
- Strongly suggested to not update the same listing ID in parallel.
- To decrease response time, send fewer date periods.

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
    "/availability-pricing/api/calendar/listings": {
      "put": {
        "tags": [
          "Calendar"
        ],
        "summary": "Update calendar for multiple listings",
        "description": "Use this endpoint to set availability and pricing for multiple listings across a range of dates.\n\nIMPORTANT:\n- It is strongly suggested updating a single unique listing ID in a single HTTP request, despite the fact the API does support receiving different listing IDs.\n- Max allowed days to be updated - 730 (~2 years)\n- Strongly suggested to not update the same listing ID in parallel.\n- To decrease response time, send fewer date periods.",
        "parameters": [],
        "requestBody": {
          "description": "Update calendar body",
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "listingId",
                    "startDate",
                    "endDate"
                  ],
                  "properties": {
                    "listingId": {
                      "description": "The listing id to update",
                      "type": "string",
                      "example": "5fa02fa358d2db673e17bc2d"
                    },
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
                      "example": "2023-01-01"
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
                    }
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
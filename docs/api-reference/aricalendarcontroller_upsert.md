# Upsert Rate Plan ARI Calendar

Set rate plan calendar availability, rates and inventory.

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
      "put": {
        "operationId": "AriCalendarController_upsert",
        "summary": "Upsert Rate Plan ARI Calendar",
        "description": "Set rate plan calendar availability, rates and inventory.",
        "parameters": [
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
        "requestBody": {
          "required": true,
          "description": "UpsertAriCalendarDto",
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "startDate": {
                      "format": "date-time",
                      "type": "string",
                      "description": "Period start date"
                    },
                    "endDate": {
                      "format": "date-time",
                      "type": "string",
                      "description": "Period end date"
                    },
                    "price": {
                      "type": "number",
                      "description": "Price for the period."
                    },
                    "minNights": {
                      "type": "number",
                      "description": "Minimum stay length."
                    },
                    "maxNights": {
                      "type": "number",
                      "description": "Maximum stay length."
                    },
                    "allotment": {
                      "type": "number",
                      "description": "Actual availability at the property."
                    },
                    "cta": {
                      "type": "boolean",
                      "description": "Closed to check-in."
                    },
                    "ctd": {
                      "type": "boolean",
                      "description": "Closed to check-out."
                    },
                    "closed": {
                      "type": "boolean",
                      "description": "is closed"
                    }
                  },
                  "required": [
                    "startDate",
                    "endDate"
                  ]
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ratePlanId": {
                      "type": "string",
                      "description": "rate plan id"
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
                    "ratePlanId",
                    "listingId",
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
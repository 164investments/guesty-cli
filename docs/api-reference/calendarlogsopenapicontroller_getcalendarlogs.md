# Get calendar block logs

Retrieves a list of block logs based on the specified filters.

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
      "name": "Calendar Logs"
    }
  ],
  "paths": {
    "/api/block-logs": {
      "get": {
        "operationId": "CalendarLogsOpenApiController_getCalendarLogs",
        "summary": "Get calendar block logs",
        "description": "Retrieves a list of block logs based on the specified filters.",
        "parameters": [
          {
            "name": "listingId",
            "required": false,
            "in": "query",
            "description": "Filters the logs by the Guesty listing ID.",
            "schema": {
              "example": "66054019764cbb000f37c450",
              "type": "string"
            }
          },
          {
            "name": "userName",
            "required": false,
            "in": "query",
            "description": "Filter logs based on the user who created the block.",
            "schema": {
              "example": "John Doe",
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "required": false,
            "in": "query",
            "description": "Filter logs based on the block's start date.",
            "schema": {
              "example": "2024-01-01",
              "type": "string",
              "format": "YYYY-MM-DD"
            }
          },
          {
            "name": "endDate",
            "required": false,
            "in": "query",
            "description": "Filter logs based on the block's end date.",
            "schema": {
              "example": "2024-02-01",
              "type": "string",
              "format": "YYYY-MM-DD"
            }
          },
          {
            "name": "blockType",
            "required": false,
            "in": "query",
            "description": "Filters logs by the type of block (manual or preparation_time).",
            "schema": {
              "type": "string",
              "enum": [
                "manual",
                "preparation_time"
              ]
            }
          },
          {
            "name": "eventType",
            "required": false,
            "in": "query",
            "description": "Filters logs by the event type (created, updated, removed).",
            "schema": {
              "enum": [
                "created",
                "updated",
                "removed"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The record has been successfully fetched",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "propertyName": {
                        "type": "string",
                        "description": "The name of the property associated with the log."
                      },
                      "userName": {
                        "type": "string",
                        "description": "The name of the user who made the changes."
                      },
                      "startDate": {
                        "type": "string",
                        "description": "The start date of the block.",
                        "format": "YYYY-MM-DD",
                        "example": "2024-01-01"
                      },
                      "endDate": {
                        "type": "string",
                        "description": "The end date of the block.",
                        "format": "YYYY-MM-DD",
                        "example": "2024-01-01"
                      },
                      "blockType": {
                        "type": "string",
                        "description": "The type of block applied."
                      },
                      "eventType": {
                        "type": "string",
                        "enum": [
                          "BLOCK_CREATED",
                          "BLOCK_UPDATED",
                          "BLOCK_REMOVED"
                        ],
                        "description": "The event type related to the block."
                      },
                      "note": {
                        "type": "string",
                        "description": "A note related to the block."
                      },
                      "reason": {
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
                        "description": "The reason for the block."
                      },
                      "doneAt": {
                        "type": "string",
                        "description": "The date when the block action was completed.",
                        "format": "YYYY-MM-DD",
                        "example": "2024-01-11"
                      }
                    },
                    "required": [
                      "propertyName",
                      "userName",
                      "startDate",
                      "endDate",
                      "blockType",
                      "eventType",
                      "note",
                      "reason",
                      "doneAt"
                    ]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request - Invalid parameters provided",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Error message here"
                    },
                    "code": {
                      "type": "string",
                      "example": "ERROR_CODE"
                    },
                    "details": {
                      "type": "object",
                      "example": {
                        "detail": "Additional error details"
                      }
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "details"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized - Authentication credentials are missing or invalid",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Error message here"
                    },
                    "code": {
                      "type": "string",
                      "example": "ERROR_CODE"
                    },
                    "details": {
                      "type": "object",
                      "example": {
                        "detail": "Additional error details"
                      }
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "details"
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Forbidden - You do not have permission to access this resource",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Error message here"
                    },
                    "code": {
                      "type": "string",
                      "example": "ERROR_CODE"
                    },
                    "details": {
                      "type": "object",
                      "example": {
                        "detail": "Additional error details"
                      }
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "details"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "No block logs found for this listing",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Error message here"
                    },
                    "code": {
                      "type": "string",
                      "example": "ERROR_CODE"
                    },
                    "details": {
                      "type": "object",
                      "example": {
                        "detail": "Additional error details"
                      }
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "details"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Internal Server Error - Something went wrong on the server",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Error message here"
                    },
                    "code": {
                      "type": "string",
                      "example": "ERROR_CODE"
                    },
                    "details": {
                      "type": "object",
                      "example": {
                        "detail": "Additional error details"
                      }
                    }
                  },
                  "required": [
                    "message",
                    "code",
                    "details"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Calendar Logs"
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
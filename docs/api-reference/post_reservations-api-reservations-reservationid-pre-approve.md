# Pre-approve an existing inquiry (Airbnb)

Use this call to send a [pre-approval](https://www.airbnb.com/help/article/35).

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
      "name": "Pre-approve inquiry"
    }
  ],
  "paths": {
    "/reservations-api/reservations/{reservationId}/pre-approve": {
      "x-summary": "pre-approve",
      "post": {
        "tags": [
          "Pre-approve inquiry"
        ],
        "summary": "Pre-approve an existing inquiry (Airbnb)",
        "description": "Use this call to send a [pre-approval](https://www.airbnb.com/help/article/35).",
        "parameters": [
          {
            "name": "reservationId",
            "in": "path",
            "description": "ID of reservation",
            "required": true,
            "schema": {
              "type": "string",
              "example": "5cc84c6919031c00212a0a38"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ae"
                    },
                    "accountId": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ae"
                    },
                    "listingId": {
                      "type": "string",
                      "example": "5d6e7a7ebf8e3800207735ae"
                    },
                    "status": {
                      "type": "string",
                      "example": "CONNECTED"
                    },
                    "checkInDateLocalized": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "checkOutDateLocalized": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "preApproveState": {
                      "type": "boolean",
                      "example": true
                    },
                    "pendingTasks": {
                      "type": "array"
                    },
                    "integration": {
                      "type": "object",
                      "properties": {
                        "platform": {
                          "type": "string",
                          "example": "manual"
                        },
                        "_id": {
                          "type": "string",
                          "example": "5d6e7a7ebf8e3800207735ae"
                        }
                      }
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "listingId",
                    "status",
                    "checkInDateLocalized",
                    "checkOutDateLocalized",
                    "preApproveState",
                    "pendingTasks",
                    "integration"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "\\\"reservationId\\\" with value \\\"63c40b0e5821e4d9e87536sd\\\" fails to match the valid mongo id pattern"
                    },
                    "type": {
                      "type": "string",
                      "example": "error"
                    },
                    "code": {
                      "type": "string",
                      "example": "VALIDATION_ERROR"
                    }
                  },
                  "example": "{\n    \"message\": \"\\\"reservationId\\\" with value \\\"63c40b0e5821e4d9e87536sd\\\" fails to match the valid mongo id pattern\",\n    \"type\": \"error\",\n    \"code\": \"VALIDATION_ERROR\"\n}",
                  "required": [
                    "message",
                    "type",
                    "code"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Unhandled exception. Something went wrong on server.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Internal Server Error"
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
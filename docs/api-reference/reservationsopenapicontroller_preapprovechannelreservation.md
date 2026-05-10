# Pre-approve a channel reservation

Pre-approve a channel reservation that is in 'inquiry' status. This endpoint creates a pre-approval request that will be processed asynchronously. The reservation must be from a channel (like Airbnb) and in 'inquiry' status to be pre-approved. Pre-approval allows guests to complete their booking without requiring additional approval from the host.

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
      "name": "Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/{reservationId}/pre-approve": {
      "post": {
        "operationId": "ReservationsOpenApiController_preApproveChannelReservation",
        "summary": "Pre-approve a channel reservation",
        "description": "Pre-approve a channel reservation that is in 'inquiry' status. This endpoint creates a pre-approval request that will be processed asynchronously. The reservation must be from a channel (like Airbnb) and in 'inquiry' status to be pre-approved. Pre-approval allows guests to complete their booking without requiring additional approval from the host.",
        "parameters": [
          {
            "name": "reservationId",
            "required": true,
            "in": "path",
            "description": "The Guesty reservation ID",
            "schema": {
              "example": "5f92cbf10cf217478ba93561",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Pre-approve request created successfully"
          },
          "201": {
            "description": ""
          },
          "400": {
            "description": "Returned if the reservation is not in a valid status for pre-approval or if a duplicate request exists",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "number",
                          "example": 422
                        },
                        "message": {
                          "type": "string"
                        },
                        "code": {
                          "type": "string"
                        },
                        "data": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "examples": {
                  "invalidStatus": {
                    "summary": "Invalid reservation status",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Only inquiry reservations can be pre-approved",
                        "code": "ERR_INVALID_RESERVATION_STATUS_FOR_PRE_APPROVE",
                        "data": "Unprocessable Entity"
                      }
                    }
                  },
                  "duplicateRequest": {
                    "summary": "Duplicate pre-approve request",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Pre-approve request already exists for this reservation",
                        "code": "ERR_DUPLICATE_PRE_APPROVE_REQUEST",
                        "data": "Unprocessable Entity"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Returned if the reservation is not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "number",
                          "example": 404
                        },
                        "message": {
                          "type": "string"
                        },
                        "code": {
                          "type": "string"
                        },
                        "data": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "error": {
                    "status": 404,
                    "message": "Reservation not found",
                    "code": "RESERVATION_NOT_FOUND",
                    "data": "Not Found"
                  }
                }
              }
            }
          },
          "422": {
            "description": "Returned if there is a validation error in the request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "number",
                          "example": 422
                        },
                        "message": {
                          "type": "string"
                        },
                        "code": {
                          "type": "string"
                        },
                        "data": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "error": {
                    "status": 422,
                    "message": "Validation failed",
                    "code": "VALIDATION_ERROR",
                    "data": "Unprocessable Entity"
                  }
                }
              }
            }
          },
          "500": {
            "description": "Indicates server-side error while processing the request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "number",
                          "example": 500
                        },
                        "message": {
                          "type": "string"
                        },
                        "code": {
                          "type": "string"
                        },
                        "data": {
                          "type": "string"
                        }
                      }
                    }
                  }
                },
                "example": {
                  "error": {
                    "status": 500,
                    "message": "Internal server error",
                    "code": "INTERNAL_SERVER_ERROR",
                    "data": "Internal Server Error"
                  }
                }
              }
            }
          }
        },
        "tags": [
          "Reservations Open Api [Beta]"
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
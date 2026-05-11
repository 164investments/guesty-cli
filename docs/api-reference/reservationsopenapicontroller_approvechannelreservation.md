# Approve a channel reservation

Approve a channel reservation that is in 'reserved' status. This endpoint creates an approval request that will be processed asynchronously. The reservation must be from a channel (like Airbnb, Booking.com, etc.) and in 'reserved' status to be approved.

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
    "/reservations-v3/{reservationId}/approve": {
      "post": {
        "operationId": "ReservationsOpenApiController_approveChannelReservation",
        "summary": "Approve a channel reservation",
        "description": "Approve a channel reservation that is in 'reserved' status. This endpoint creates an approval request that will be processed asynchronously. The reservation must be from a channel (like Airbnb, Booking.com, etc.) and in 'reserved' status to be approved.",
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
            "description": "Approval request created successfully"
          },
          "201": {
            "description": ""
          },
          "400": {
            "description": "Returned if the reservation is not in a valid status for approval or if required fields are missing",
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
                          "example": 400
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
                        "status": 400,
                        "message": "Invalid reservation status for approve/decline",
                        "code": "ERR_INVALID_RESERVATION_STATUS_FOR_APPROVE_DECLINE",
                        "data": "Only reserved reservations can be approved or declined"
                      }
                    }
                  },
                  "duplicateRequest": {
                    "summary": "Duplicate approval request",
                    "value": {
                      "error": {
                        "status": 400,
                        "message": "Duplicate approve/decline request",
                        "code": "DUPLICATE_REQUEST",
                        "data": "Approve/decline request already exists for this reservation"
                      }
                    }
                  },
                  "reservationNotFound": {
                    "summary": "Reservation not found",
                    "value": {
                      "error": {
                        "status": 404,
                        "message": "Reservation not found",
                        "code": "RESERVATION_NOT_FOUND",
                        "data": "Reservation not found"
                      }
                    }
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
                    "data": "Invalid request parameters"
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
                    "data": "An unexpected error occurred while processing the request"
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
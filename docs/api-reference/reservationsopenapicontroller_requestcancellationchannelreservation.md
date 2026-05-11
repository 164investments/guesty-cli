# Request cancellation of a channel reservation

Request cancellation of a channel reservation with a reason and message to the guest and channel. The reservation must be from a channel and in 'confirmed' status to be cancelled.

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
    "/reservations-v3/{reservationId}/request-cancellation": {
      "post": {
        "operationId": "ReservationsOpenApiController_requestCancellationChannelReservation",
        "summary": "Request cancellation of a channel reservation",
        "description": "Request cancellation of a channel reservation with a reason and message to the guest and channel. The reservation must be from a channel and in 'confirmed' status to be cancelled.",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reason": {
                    "enum": [
                      "DECLINE_REASON_HOST_DOUBLE",
                      "DECLINE_REASON_HOST_CHANGE",
                      "DECLINE_REASON_HOST_UNAUTHORIZED_PARTY",
                      "DECLINE_REASON_HOST_BEHAVIOR",
                      "DECLINE_REASON_HOST_OTHER",
                      "DECLINE_REASON_HOST_ASKED",
                      "DECLINE_REASON_COVID19_HOST",
                      "DECLINE_REASON_HOST_BAD_FIT",
                      "DECLINE_REASON_HOST_BAD_REVIEWS_SPARSE_PROFILE"
                    ],
                    "type": "string",
                    "description": "The primary reason for cancelling the reservation. This is required by the channel to process the cancellation",
                    "example": "DECLINE_REASON_HOST_CHANGE"
                  },
                  "subReason": {
                    "enum": [
                      "DECLINE_REASON_HOST_EMERGENCY",
                      "DECLINE_REASON_HOST_HOST_UNAVAILABLE",
                      "DECLINE_REASON_HOST_DOUBLE_BOOKED",
                      "DECLINE_REASON_HOST_RESERVATION_LENGTH",
                      "DECLINE_REASON_HOST_DIFFERENT_PRICE",
                      "DECLINE_REASON_HOST_UNAUTHORIZED_PARTY",
                      "DECLINE_REASON_HOST_PARTY_REVIEWS",
                      "DECLINE_REASON_HOST_PARTY_INDICATION",
                      "DECLINE_REASON_HOST_BEHAVIOR_REVIEWS",
                      "DECLINE_REASON_HOST_BEHAVIOR_INDICATION",
                      "DECLINE_REASON_HOST_BEHAVIOR_OTHER",
                      "DECLINE_REASON_HOST_GUEST_PROFILE"
                    ],
                    "type": "string",
                    "description": "The specific sub-reason that provides more detail about the cancellation. This helps the channel understand the context better",
                    "example": "DECLINE_REASON_HOST_EMERGENCY"
                  },
                  "messageToChannel": {
                    "type": "string",
                    "description": "Message to be sent to the channel explaining the cancellation",
                    "example": "Due to an emergency situation, we need to cancel this reservation"
                  },
                  "messageToGuest": {
                    "type": "string",
                    "description": "Message to be sent to the guest explaining the cancellation. This will be communicated to the guest through the channel",
                    "example": "We sincerely apologize, but due to unforeseen circumstances, we must cancel your reservation. We hope to host you in the future"
                  }
                },
                "required": [
                  "reason",
                  "subReason",
                  "messageToChannel",
                  "messageToGuest"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Cancellation request created successfully"
          },
          "201": {
            "description": ""
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
            "description": "Returned if the reservation is not in a valid status for cancellation or if required fields are missing",
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
                  "platformNotSupported": {
                    "summary": "Platform not supported",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Reservation platform is not supported",
                        "code": "VALIDATION_ERROR",
                        "data": "Only Airbnb reservations can be cancelled through this endpoint"
                      }
                    }
                  },
                  "reservationNotConfirmed": {
                    "summary": "Reservation not confirmed",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Reservation is not confirmed and cannot be cancelled",
                        "code": "VALIDATION_ERROR",
                        "data": "Only confirmed reservations can be cancelled"
                      }
                    }
                  },
                  "duplicateRequest": {
                    "summary": "Duplicate cancellation request",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Cancellation request already exists",
                        "code": "VALIDATION_ERROR",
                        "data": "A cancellation request has already been submitted for this reservation"
                      }
                    }
                  },
                  "missingFields": {
                    "summary": "Missing required fields",
                    "value": {
                      "error": {
                        "status": 422,
                        "message": "Validation failed",
                        "code": "VALIDATION_ERROR",
                        "data": "Required fields are missing: reason, subReason, messageToChannel, messageToGuest"
                      }
                    }
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
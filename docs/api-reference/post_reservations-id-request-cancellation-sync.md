# Request airbnb reservation cancellation on the platform

Use this call to request a new reservation cancellation from your guest.

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
      "name": "Reservations"
    }
  ],
  "paths": {
    "/reservations/{id}/request-cancellation-sync": {
      "post": {
        "tags": [
          "Reservations"
        ],
        "summary": "Request airbnb reservation cancellation on the platform",
        "description": "Use this call to request a new reservation cancellation from your guest.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "Reservation ID",
            "example": "6550033b5c3e4cff130c3564",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "cancellationData": {
                    "type": "object",
                    "properties": {
                      "reason": {
                        "type": "string",
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
                        "example": "DECLINE_REASON_HOST_DOUBLE"
                      },
                      "subReason": {
                        "type": "string",
                        "example": "DECLINE_REASON_HOST_HOST_UNAVAILABLE",
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
                        ]
                      },
                      "messageToAirbnb": {
                        "type": "string"
                      },
                      "messageToGuest": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Result of operation: true or false",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "details": {
                      "type": "object",
                      "properties": {
                        "reason": {
                          "type": "string",
                          "example": "DECLINE_REASON_HOST_DOUBLE"
                        },
                        "subReason": {
                          "type": "string",
                          "example": "DECLINE_REASON_HOST_HOST_UNAVAILABLE"
                        },
                        "messageToAirbnb": {
                          "type": "string"
                        },
                        "messageToGuest": {
                          "type": "string"
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    },
                    "cancelledAt": {
                      "type": "string",
                      "format": "date"
                    }
                  }
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
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "description": "Reservation cancellation error message"
                        },
                        "cause": {
                          "type": "string",
                          "description": "Reservation cancellation sub error message"
                        },
                        "meta": {
                          "type": "object",
                          "description": "Error metadata",
                          "properties": {}
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "description": "Reservation cancellation error message"
                        },
                        "cause": {
                          "type": "string",
                          "description": "Reservation cancellation sub error message"
                        },
                        "meta": {
                          "type": "object",
                          "description": "Error metadata",
                          "properties": {}
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "description": "Reservation cancellation error message"
                        },
                        "cause": {
                          "type": "string",
                          "description": "Reservation cancellation sub error message"
                        },
                        "meta": {
                          "type": "object",
                          "description": "Error metadata",
                          "properties": {}
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "description": "Reservation cancellation error message"
                        },
                        "cause": {
                          "type": "string",
                          "description": "Reservation cancellation sub error message"
                        },
                        "meta": {
                          "type": "object",
                          "description": "Error metadata",
                          "properties": {}
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    }
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
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "description": "Reservation cancellation error message"
                        },
                        "cause": {
                          "type": "string",
                          "description": "Reservation cancellation sub error message"
                        },
                        "meta": {
                          "type": "object",
                          "description": "Error metadata",
                          "properties": {}
                        }
                      }
                    },
                    "isSuccessful": {
                      "type": "boolean",
                      "example": true
                    }
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
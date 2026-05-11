# Publish a custom-channel review

Publish a custom-channel review

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
      "name": "Review"
    }
  ],
  "paths": {
    "/reviews/custom-channel-reviews": {
      "post": {
        "operationId": "ReviewController_createCustomChannelReview",
        "summary": "Publish a custom-channel review",
        "description": "Publish a custom-channel review",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "customChannelName": {
                    "type": "string",
                    "format": "string",
                    "example": "Marketing Website"
                  },
                  "internalReservationId": {
                    "type": "string",
                    "format": "string",
                    "description": "Guesty Reservation ID"
                  },
                  "externalReviewId": {
                    "type": "string",
                    "format": "string",
                    "description": "Custom Source Review ID"
                  },
                  "createdAt": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Review creation date and time",
                    "example": "2026-01-15T10:30:00.000Z"
                  },
                  "updatedAt": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Review last update date and time",
                    "example": "2026-01-15T10:30:00.000Z"
                  },
                  "rating": {
                    "type": "number",
                    "format": "number",
                    "description": "Rating"
                  },
                  "bodyText": {
                    "type": "string",
                    "format": "string",
                    "description": "Review Body Text"
                  },
                  "reviewerName": {
                    "type": "string",
                    "format": "string",
                    "description": "Reviewer Name"
                  },
                  "titleText": {
                    "type": "string",
                    "format": "string",
                    "description": "Review Title Text"
                  },
                  "locale": {
                    "type": "string",
                    "format": "string",
                    "description": "Review Texts Locale"
                  },
                  "categoryRatings": {
                    "type": "object",
                    "description": "A map of category names to their rating scores (integer, 1-5)",
                    "additionalProperties": {
                      "type": "number",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "example": {
                      "cleanliness": 5,
                      "communication": 4,
                      "location": 3
                    }
                  }
                },
                "required": [
                  "customChannelName",
                  "internalReservationId",
                  "externalReviewId",
                  "createdAt",
                  "updatedAt",
                  "rating",
                  "bodyText",
                  "reviewerName"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Upsert Review Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "object",
                      "format": "string"
                    },
                    "accountId": {
                      "type": "object",
                      "format": "string"
                    },
                    "externalReviewId": {
                      "type": "string",
                      "format": "string"
                    },
                    "channelId": {
                      "type": "string",
                      "enum": [
                        "bookingCom",
                        "airbnb2",
                        "homeaway2",
                        "custom"
                      ],
                      "format": "string",
                      "example": "bookingCom"
                    },
                    "customChannelName": {
                      "type": "string",
                      "format": "string",
                      "example": "Marketing Website A"
                    },
                    "subListingId": {
                      "type": "object",
                      "format": "string"
                    },
                    "listingId": {
                      "type": "object",
                      "format": "string"
                    },
                    "complexId": {
                      "type": "object",
                      "format": "string"
                    },
                    "externalListingId": {
                      "type": "string",
                      "format": "string"
                    },
                    "externalComplexId": {
                      "type": "string",
                      "format": "string"
                    },
                    "reservationId": {
                      "type": "object",
                      "format": "string"
                    },
                    "externalReservationId": {
                      "type": "string",
                      "format": "string"
                    },
                    "guestId": {
                      "type": "object",
                      "format": "string"
                    },
                    "createdAt": {
                      "format": "YYYY-MM-DD",
                      "type": "string"
                    },
                    "updatedAt": {
                      "format": "YYYY-MM-DD",
                      "type": "string"
                    },
                    "createdAtGuesty": {
                      "format": "YYYY-MM-DD",
                      "type": "string"
                    },
                    "updatedAtGuesty": {
                      "format": "YYYY-MM-DD",
                      "type": "string"
                    },
                    "rawReview": {
                      "type": "object"
                    },
                    "contents": {
                      "description": "Review contents. For custom-channels reviews only",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "body": {
                              "type": "string",
                              "format": "string"
                            },
                            "reviewerName": {
                              "type": "string",
                              "format": "string"
                            },
                            "title": {
                              "type": "string",
                              "format": "string"
                            },
                            "locale": {
                              "type": "string",
                              "format": "string",
                              "example": "en-US"
                            },
                            "rating": {
                              "type": "number",
                              "format": "number",
                              "example": 5,
                              "description": "Rating from 1 to 10"
                            }
                          },
                          "required": [
                            "body",
                            "reviewerName",
                            "rating"
                          ]
                        }
                      ]
                    },
                    "reviewReplies": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "status": {
                            "enum": [
                              "PENDING",
                              "FAILED",
                              "COMPLETED",
                              "NOT_FOUND"
                            ],
                            "type": "string"
                          },
                          "reviewReply": {
                            "type": "string"
                          },
                          "replyAt": {
                            "format": "date-time",
                            "type": "string"
                          }
                        },
                        "required": [
                          "status",
                          "reviewReply",
                          "replyAt"
                        ]
                      }
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "externalReviewId",
                    "channelId",
                    "listingId",
                    "rawReview"
                  ]
                }
              }
            }
          },
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Not Found"
          }
        },
        "tags": [
          "Review"
        ],
        "security": [
          {
            "authorization-token": []
          }
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
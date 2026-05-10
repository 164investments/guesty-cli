# Retrieve reviews sorted descending by last update time

Retrieve reviews sorted descending by last update time

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
    "/reviews": {
      "get": {
        "operationId": "ReviewController_getReviews",
        "summary": "Retrieve reviews sorted descending by last update time",
        "description": "Retrieve reviews sorted descending by last update time",
        "parameters": [
          {
            "name": "channelId",
            "required": false,
            "in": "query",
            "description": "Channel",
            "schema": {
              "enum": [
                "bookingCom",
                "airbnb2",
                "homeaway2",
                "custom"
              ],
              "type": "string"
            }
          },
          {
            "name": "customChannelName",
            "required": false,
            "in": "query",
            "description": "Custom Source Name",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "listingId",
            "required": false,
            "in": "query",
            "description": "Guesty Listing ID",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "required": false,
            "in": "query",
            "description": "Guesty Reservation ID",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "externalReservationId",
            "required": false,
            "in": "query",
            "description": "Channel Reservation ID",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "startDate",
            "required": false,
            "in": "query",
            "description": "Start date-time, greater than equal to updatedAt date-time of the review",
            "schema": {
              "format": "date-time",
              "type": "string"
            }
          },
          {
            "name": "endDate",
            "required": false,
            "in": "query",
            "description": "End date-time, less than equal to updatedAt date-time of the review",
            "schema": {
              "format": "date-time",
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "The numbers of items to return",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "The number of items to skip before starting to collect the result set",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "externalReviewId",
            "required": false,
            "in": "query",
            "description": "Channel Review ID",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "includeCustomChannels",
            "required": false,
            "in": "query",
            "description": "Include custom channels in search",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Get Reviews Response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "isRawResponse": {
                      "type": "boolean"
                    },
                    "data": {
                      "type": "object"
                    },
                    "skip": {
                      "type": "number"
                    },
                    "limit": {
                      "type": "number"
                    },
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string"
                        },
                        "message": {
                          "type": "string"
                        },
                        "data": {
                          "type": "object"
                        }
                      },
                      "required": [
                        "code",
                        "message",
                        "data"
                      ]
                    }
                  }
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
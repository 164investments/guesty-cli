# Create a group reservation

This endpoint allows the creation of a group reservation, based on an array of quotes

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
      "name": "Group Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/group": {
      "post": {
        "operationId": "GroupReservationsOpenAPIController_create",
        "summary": "Create a group reservation",
        "description": "This endpoint allows the creation of a group reservation, based on an array of quotes",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "quoteAndRatePlanIds": {
                    "description": "An array of objects containing quote IDs and rate plan IDs",
                    "example": [
                      {
                        "quoteId": "6213b03e7f0ba50032296f4a",
                        "ratePlanId": "default-rateplan-id"
                      },
                      {
                        "quoteId": "6213b03e7f0ba50032296f4b",
                        "ratePlanId": "36ft523e7f0ba500323hf736"
                      }
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "quoteId": {
                          "type": "string",
                          "description": "The quote ID",
                          "example": "6213b03e7f0ba50032296f4a"
                        },
                        "ratePlanId": {
                          "type": "string",
                          "description": "The rate plan ID",
                          "example": "6213b03e7f0ba50032296f4a"
                        },
                        "status": {
                          "enum": [
                            "confirmed",
                            "reserved",
                            "awaiting_payment",
                            "inquiry",
                            "canceled",
                            "closed",
                            "declined",
                            "expired"
                          ],
                          "type": "string",
                          "example": "reserved",
                          "description": "Status for an individual reservation, if not defined we will use the status of the group"
                        },
                        "booker": {
                          "description": "The booker for specific reservation",
                          "allOf": [
                            {
                              "type": "object",
                              "properties": {
                                "_id": {
                                  "type": "string",
                                  "description": "The booker ID",
                                  "example": "6213b03e7f0ba50032296f4a"
                                },
                                "fullName": {
                                  "type": "string",
                                  "description": "The booker's full name",
                                  "example": "Full Name"
                                }
                              },
                              "required": [
                                "_id",
                                "fullName"
                              ]
                            }
                          ]
                        }
                      },
                      "required": [
                        "quoteId",
                        "ratePlanId"
                      ]
                    }
                  },
                  "name": {
                    "type": "string",
                    "example": "guesty-company-trip"
                  },
                  "source": {
                    "type": "string",
                    "description": "Source of reservation",
                    "example": "Manual"
                  },
                  "status": {
                    "enum": [
                      "confirmed",
                      "reserved",
                      "awaiting_payment",
                      "inquiry",
                      "canceled",
                      "closed",
                      "declined",
                      "expired"
                    ],
                    "type": "string",
                    "example": "reserved"
                  },
                  "reservedUntil": {
                    "enum": [
                      -1,
                      0.5,
                      0.25,
                      0.17,
                      12,
                      24,
                      36,
                      48,
                      72
                    ],
                    "type": "number",
                    "description": "Indicates for how long a reservation is valid after creation (in hours)",
                    "example": 36
                  },
                  "note": {
                    "type": "string",
                    "description": "The reservation notes"
                  },
                  "groupBooker": {
                    "description": "The default booker for group reservation",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string",
                            "description": "The booker ID",
                            "example": "6213b03e7f0ba50032296f4a"
                          },
                          "fullName": {
                            "type": "string",
                            "description": "The booker's full name",
                            "example": "Full Name"
                          }
                        },
                        "required": [
                          "_id",
                          "fullName"
                        ]
                      }
                    ]
                  },
                  "coupons": {
                    "description": "List of coupons",
                    "example": [
                      "VeryCoolCoupon",
                      "VeryCoolCoupon2"
                    ],
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "chargeMethod": {
                    "enum": [
                      "PER_GROUP",
                      "PER_RESERVATION"
                    ],
                    "type": "string",
                    "description": "The charge method for the group reservation (PER_GROUP method is not applicable to to accounting users)",
                    "default": "PER_GROUP",
                    "example": "PER_RESERVATION"
                  }
                },
                "required": [
                  "quoteAndRatePlanIds",
                  "name",
                  "chargeMethod"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "The group reservation has been created successfuly",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "example": "df7hf01cnduhdb2125854dj8",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {}
                        }
                      ]
                    },
                    "accountId": {
                      "example": "df7hf01cnduhdb2125854dj8",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {}
                        }
                      ]
                    },
                    "sendQuoteId": {
                      "example": "df7hf01cnduhdb2125854dj8",
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {}
                        }
                      ]
                    },
                    "platform": {
                      "type": "string",
                      "example": "direct"
                    },
                    "name": {
                      "type": "string",
                      "example": "guesty-company-trip"
                    },
                    "source": {
                      "type": "string",
                      "example": "manual"
                    },
                    "bookerId": {
                      "type": "string"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "note": {
                      "type": "string"
                    },
                    "confirmationCode": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "platform",
                    "name",
                    "source",
                    "createdAt",
                    "note",
                    "confirmationCode"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Group reservation creating failed"
          }
        },
        "tags": [
          "Group Reservations Open Api [Beta]"
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
# Upsert Airbnb listing expectations

Upsert listing expectations for Airbnb channel by Guesty listing ID.

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
      "name": "Airbnb Listing Expectations"
    }
  ],
  "paths": {
    "/airbnb-resource-service/listing-expectations/{id}": {
      "put": {
        "operationId": "ListingExpectationsController_upsertListingExpectations",
        "summary": "Upsert Airbnb listing expectations",
        "description": "Upsert listing expectations for Airbnb channel by Guesty listing ID.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Guesty listing id",
            "schema": {
              "example": "5319674e4930a7f09b075698",
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "description": "Upsert listing expectations body",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "listingExpectationsForGuests": {
                    "example": [
                      {
                        "type": "requires_stairs",
                        "added_details": "Must climb stairs. Describe the stairs (for example, how many flights)."
                      }
                    ],
                    "description": "Listing expectations for guests",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "type": {
                            "type": "string",
                            "description": "Listing expectations type",
                            "example": "requires_stairs",
                            "enum": [
                              "requires_stairs",
                              "potential_noise",
                              "has_pets",
                              "limited_parking",
                              "shared_spaces",
                              "limited_amenities",
                              "surveillance",
                              "weapons",
                              "animals",
                              "pool_or_jacuzzi_with_no_fence",
                              "lake_or_river_or_water_body",
                              "climbing_or_play_structure",
                              "heights_with_no_fence"
                            ]
                          },
                          "added_details": {
                            "type": "string",
                            "description": "Listing expectations added_details",
                            "example": "Must climb stairs. Describe the stairs (for example, how many flights)."
                          }
                        },
                        "required": [
                          "type",
                          "added_details"
                        ]
                      }
                    ]
                  }
                },
                "required": [
                  "listingExpectationsForGuests"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Listing expectations for Airbnb channel have been upserted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "Guesty listing expectation ID"
                    },
                    "internalListingId": {
                      "type": "string",
                      "description": "Guesty listing ID"
                    },
                    "externalListingId": {
                      "type": "string",
                      "description": "Airbnb listing ID"
                    },
                    "integrationId": {
                      "type": "string",
                      "description": "Guesty integration ID"
                    },
                    "airbnbData": {
                      "description": "Listing expectations data",
                      "example": [
                        {
                          "type": "requires_stairs",
                          "added_details": "Must climb stairs. Describe the stairs (for example, how many flights)."
                        },
                        {
                          "type": "potential_noise",
                          "added_details": "The building is being renovated"
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string",
                      "description": "Created at date and time"
                    },
                    "updatedAt": {
                      "format": "date-time",
                      "type": "string",
                      "description": "Updated at date and time"
                    }
                  },
                  "required": [
                    "airbnbData"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "The provided input data is invalid",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    },
                    "status": {
                      "type": "number"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "example": "[listingExpectationsForGuests.0.added_details must be a string]",
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "error": {
                          "type": "string"
                        },
                        "statusCode": {
                          "type": "number"
                        }
                      },
                      "required": [
                        "message",
                        "error",
                        "statusCode"
                      ]
                    }
                  },
                  "required": [
                    "name",
                    "message",
                    "code",
                    "status",
                    "data"
                  ]
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
                          "type": "string"
                        },
                        "code": {
                          "type": "string"
                        },
                        "status": {
                          "type": "number"
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Resource is not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string"
                        },
                        "status": {
                          "type": "number"
                        },
                        "code": {
                          "type": "string"
                        },
                        "meta": {
                          "type": "string"
                        },
                        "data": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "message",
                        "status",
                        "code",
                        "meta",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Airbnb Listing Expectations"
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
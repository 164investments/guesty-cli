# Retrieve Airbnb listing expectations

Get listing expectations for Airbnb channel by Guesty listing ID.

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
      "get": {
        "operationId": "ListingExpectationsController_getListingExpectations",
        "summary": "Retrieve Airbnb listing expectations",
        "description": "Get listing expectations for Airbnb channel by Guesty listing ID.",
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
        "responses": {
          "200": {
            "description": "Listing expectations for Airbnb channel",
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
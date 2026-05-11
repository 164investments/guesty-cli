# Upsert translation

Upsert a new translation for specific listing and language slug.

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
      "name": "Marketing fields"
    }
  ],
  "paths": {
    "/marketing/fields/{id}/upsert": {
      "put": {
        "operationId": "upsertFields",
        "summary": "Upsert translation",
        "description": "Upsert a new translation for specific listing and language slug.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [
          {
            "name": "language",
            "required": true,
            "in": "query",
            "description": "Language slug for the translation",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The listing ID whose translations you wish to upsert.",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
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
                  "active": {
                    "type": "boolean",
                    "description": "Show if translation is active",
                    "example": true
                  },
                  "title": {
                    "type": "string",
                    "description": "Listing title",
                    "example": "Private 2BR near Downtown Detroit Queen Beds"
                  },
                  "summary": {
                    "type": "string",
                    "description": "Listing description",
                    "example": "You can end your search NOW. You've just found an ideal place for your trip to Detroit"
                  },
                  "space": {
                    "type": "string",
                    "description": "Listing space description",
                    "example": "We take absolute pleasure in welcoming you to the inviting 2B2B. With a stunning top floor view of Detroit"
                  },
                  "access": {
                    "type": "string",
                    "description": "Listing access description",
                    "example": "Laundry and Dryer is available in your unit. Paid Car parking is available for attached car garage"
                  },
                  "neighborhood": {
                    "type": "string",
                    "description": "Listing neighborhood description",
                    "example": "This apartment is situated right in the heart of Detroit"
                  },
                  "transit": {
                    "type": "string",
                    "description": "Listing transit description",
                    "example": "The apartment is easy reachable by train as St James stations"
                  },
                  "notes": {
                    "type": "string",
                    "description": "Listing notes",
                    "example": "The keys will be available to collect from a local Keynest Shop"
                  },
                  "interactionWithGuests": {
                    "type": "string",
                    "description": "Interaction with guests description",
                    "example": "We will welcome you in person and explain about the area and answer any question you may have."
                  },
                  "checkInInstructions": {
                    "description": "Details about check-in process",
                    "example": {
                      "primaryCheckIn": "RECEPTION",
                      "alternativeCheckIn": "LOCK_BOX",
                      "notes": "Happy to see you in our apartments",
                      "welcomeMessage": "Happy to see you in our apartments"
                    },
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "primaryCheckIn": {
                            "type": "string"
                          },
                          "alternativeCheckIn": {
                            "type": "string"
                          },
                          "notes": {
                            "type": "string"
                          },
                          "welcomeMessage": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "primaryCheckIn",
                          "alternativeCheckIn",
                          "notes",
                          "welcomeMessage"
                        ]
                      }
                    ]
                  },
                  "descriptionSetId": {
                    "description": "An Id of a description set.",
                    "example": "63baba9c5c25ccae5595832b",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Return the updated translation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "languageSlug": {
                      "type": "string"
                    },
                    "active": {
                      "type": "boolean"
                    },
                    "title": {
                      "type": "string"
                    },
                    "summary": {
                      "type": "string"
                    },
                    "space": {
                      "type": "string"
                    },
                    "access": {
                      "type": "string"
                    },
                    "neighborhood": {
                      "type": "string"
                    },
                    "transit": {
                      "type": "string"
                    },
                    "notes": {
                      "type": "string"
                    },
                    "interactionWithGuests": {
                      "type": "string"
                    },
                    "checkInInstructions": {
                      "description": "Details about check-in process",
                      "example": {
                        "primaryCheckIn": "RECEPTION",
                        "alternativeCheckIn": "LOCK_BOX",
                        "notes": "Happy to see you in our apartments",
                        "welcomeMessage": "Happy to see you in our apartments"
                      },
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "primaryCheckIn": {
                              "type": "string"
                            },
                            "alternativeCheckIn": {
                              "type": "string"
                            },
                            "notes": {
                              "type": "string"
                            },
                            "welcomeMessage": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "primaryCheckIn",
                            "alternativeCheckIn",
                            "notes",
                            "welcomeMessage"
                          ]
                        }
                      ]
                    },
                    "channels": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "required": [
                    "languageSlug",
                    "active",
                    "title",
                    "summary",
                    "space",
                    "access",
                    "neighborhood",
                    "transit",
                    "notes",
                    "interactionWithGuests",
                    "checkInInstructions",
                    "channels"
                  ]
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
                          "example": "Not Found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
                        },
                        "data": {
                          "type": "string",
                          "example": "Not Found"
                        }
                      }
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
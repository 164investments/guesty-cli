# [Beta] Get a list of translation fields per description set.

Get a list of translation fields for a specific language slug or all languages per description set.

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
    "/marketing/fields/{id}/description-sets/{descriptionSetId}": {
      "get": {
        "operationId": "getFieldsPerDescriptionSet",
        "summary": "[Beta] Get a list of translation fields per description set.",
        "description": "Get a list of translation fields for a specific language slug or all languages per description set.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [
          {
            "name": "language",
            "required": true,
            "in": "query",
            "description": "Language slug for retrieving the translation. To get all translations for a specific listing, please use language=all.",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "descriptionSetId",
            "required": true,
            "in": "path",
            "description": "The Description Set ID whose translations you wish to retrieve.",
            "schema": {
              "type": "string",
              "example": "6b2149c9f579400024388c48"
            }
          },
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The listing ID whose translations you wish to retrieve.",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the translation objects per Description Set.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "listingId": {
                      "type": "string",
                      "description": "Listing ID",
                      "example": "5b2149c9f579400024388c47"
                    },
                    "en_us": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "en_gb": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "en_au": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "en_nz": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "en_ca": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "da_dk": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "es_ar": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "es_es": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "es_mx": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "hu_hu": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "nl_nl": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "pt_pt": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "pt_br": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "de_de": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "fr_fr": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "fr_ca": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "it_it": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "pl_pl": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "ru_ru": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "hr_hr": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "ga_gp": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    },
                    "zh_chs": {
                      "type": "object",
                      "properties": {
                        "active": {
                          "type": "boolean",
                          "description": "Is translation active",
                          "example": true
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
                          "type": "string",
                          "description": "Listing notes",
                          "example": "Some notes about listing"
                        },
                        "interactionWithGuests": {
                          "type": "string"
                        },
                        "checkInInstructions": {
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
                      },
                      "required": [
                        "active",
                        "title",
                        "summary",
                        "space",
                        "access",
                        "neighborhood",
                        "transit",
                        "interactionWithGuests",
                        "checkInInstructions"
                      ]
                    }
                  },
                  "required": [
                    "listingId",
                    "en_us",
                    "en_gb",
                    "en_au",
                    "en_nz",
                    "en_ca",
                    "da_dk",
                    "es_ar",
                    "es_es",
                    "es_mx",
                    "hu_hu",
                    "nl_nl",
                    "pt_pt",
                    "pt_br",
                    "de_de",
                    "fr_fr",
                    "fr_ca",
                    "it_it",
                    "pl_pl",
                    "ru_ru",
                    "hr_hr",
                    "ga_gp",
                    "zh_chs"
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
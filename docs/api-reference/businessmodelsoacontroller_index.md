# Get Business Models

Get list of Business Models by accountId

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
      "name": "Accounting (only available for accounting add-on users)"
    }
  ],
  "paths": {
    "/business-models-api/light-business-models": {
      "get": {
        "operationId": "BusinessModelsOAController_index",
        "summary": "Get Business Models",
        "description": "Get list of Business Models by accountId",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "required": false,
            "description": "Skip number of records. In case nothing provided so nothing will be skipped",
            "name": "skip",
            "in": "query",
            "schema": {
              "minimum": 0,
              "example": 5,
              "type": "number"
            }
          },
          {
            "required": false,
            "description": "Limit for list of records. In case nothing provided all the records will be returned",
            "name": "limit",
            "in": "query",
            "schema": {
              "minimum": 0,
              "example": 10,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Latest versions of business models response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "skip": {
                      "type": "number"
                    },
                    "limit": {
                      "type": "number"
                    },
                    "count": {
                      "type": "number"
                    },
                    "list": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string"
                          },
                          "listingsCount": {
                            "type": "number"
                          },
                          "name": {
                            "type": "string"
                          },
                          "modifier": {
                            "type": "string"
                          },
                          "activationDate": {
                            "type": "string"
                          },
                          "createdAt": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "listingsCount",
                          "name",
                          "modifier",
                          "activationDate",
                          "createdAt"
                        ]
                      }
                    }
                  },
                  "required": [
                    "skip",
                    "limit",
                    "count",
                    "list"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Input data is not valid",
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
                          "example": "Bad Request"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "each value in listingIds must be a string",
                            "listingIds must be an array",
                            "listingIds should not be empty"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
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
          },
          "403": {
            "description": "You do not have sufficient permissions to access this resource",
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
                          "example": "Missing account_id error message"
                        },
                        "status": {
                          "type": "number",
                          "example": 403
                        }
                      },
                      "required": [
                        "message",
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
            "description": "Can't find business model, by provided accountId",
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
                          "example": "Can't find business-model with ID {business_model_id}"
                        },
                        "status": {
                          "type": "number",
                          "example": 404
                        }
                      },
                      "required": [
                        "message",
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
          "500": {
            "description": "Unhandled exception. Something went wrong on server",
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
                          "example": "Something went wrong"
                        },
                        "status": {
                          "type": "number",
                          "example": 500
                        }
                      },
                      "required": [
                        "message",
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
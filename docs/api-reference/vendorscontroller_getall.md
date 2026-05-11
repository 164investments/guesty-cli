# Query vendors

Get a list of vendors

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
      "name": "Vendors (only available for accounting add-on users)"
    }
  ],
  "paths": {
    "/vendors": {
      "get": {
        "operationId": "VendorsController_getAll",
        "summary": "Query vendors",
        "description": "Get a list of vendors",
        "parameters": [
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Pagination param. Limit the number of results",
            "schema": {
              "minimum": 25,
              "maximum": 100,
              "default": 25,
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Pagination param. Skip a number of the first results.",
            "schema": {
              "minimum": 0,
              "default": 0,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of vendors response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "count": {
                      "type": "number"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "company": {
                            "type": "string"
                          },
                          "firstName": {
                            "type": "string"
                          },
                          "lastName": {
                            "type": "string"
                          },
                          "fullName": {
                            "type": "string"
                          },
                          "phone": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "email": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "address": {
                            "type": "string"
                          },
                          "code": {
                            "type": "string"
                          },
                          "notes": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "id",
                          "company",
                          "firstName",
                          "lastName",
                          "phone",
                          "email"
                        ]
                      }
                    }
                  },
                  "required": [
                    "count",
                    "results"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Validation failed",
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
                        "status": {
                          "type": "number",
                          "example": 400
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "data": {
                          "example": [
                            "limit must not be less than 25"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "status",
                        "code",
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
        },
        "tags": [
          "Vendors (only available for accounting add-on users)"
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
# Get All Promotions

Retrieves all eligible, ongoing, and expired promotions on the account.

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
      "name": "Promotions Open Api"
    }
  ],
  "paths": {
    "/rm-promotions/promotions": {
      "get": {
        "operationId": "PromotionController_getList",
        "summary": "Get All Promotions",
        "description": "Retrieves all eligible, ongoing, and expired promotions on the account.",
        "parameters": [],
        "responses": {
          "200": {
            "description": "Returns a list of all promotions on the account.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "description": "List of promotion results.",
                      "example": [
                        {
                          "_id": "63ee4b7e459ca31532f",
                          "name": "Promotion 1"
                        },
                        {
                          "_id": "63ee4b7e459ca31532f",
                          "name": "Promotion 2"
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "description": "The MongoDB ID of the promotion.",
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {}
                              }
                            ]
                          },
                          "name": {
                            "type": "string",
                            "description": "Name of the promotion."
                          }
                        },
                        "required": [
                          "name"
                        ]
                      }
                    },
                    "count": {
                      "type": "number",
                      "description": "Number of promotions in the result set.",
                      "example": 10
                    },
                    "limit": {
                      "type": "number",
                      "description": "Maximum number of promotions that can be returned in the response.",
                      "example": 10
                    },
                    "skip": {
                      "type": "number",
                      "description": "Number of promotions that should be skipped from the result set.",
                      "example": 0
                    },
                    "requestId": {
                      "type": "string",
                      "description": "ID of request.",
                      "example": "123e4567-e89b-12d3-a456-426614174000"
                    }
                  },
                  "required": [
                    "results",
                    "count",
                    "limit",
                    "skip",
                    "requestId"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Validation error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "statusCode": {
                      "enum": [
                        400
                      ],
                      "type": "number",
                      "description": "HTTP status code.",
                      "example": 400
                    },
                    "message": {
                      "description": "Bad request error message.",
                      "oneOf": [
                        {
                          "type": "string"
                        },
                        {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      ],
                      "example": "Bad Request"
                    },
                    "error": {
                      "type": "string",
                      "description": "Short error title.",
                      "example": "Bad Request"
                    }
                  },
                  "required": [
                    "statusCode",
                    "message",
                    "error"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Authorization error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "statusCode": {
                      "enum": [
                        401
                      ],
                      "type": "number",
                      "description": "HTTP status code.",
                      "example": 401
                    },
                    "message": {
                      "type": "string",
                      "description": "Unauthorized error message.",
                      "example": "Unauthorized"
                    },
                    "error": {
                      "type": "string",
                      "description": "Short error title.",
                      "example": "Unauthorized"
                    }
                  },
                  "required": [
                    "statusCode",
                    "message",
                    "error"
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Feature is not enabled for this accountId.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "description": "Forbidden error message.",
                      "example": "Forbidden"
                    },
                    "code": {
                      "enum": [
                        403
                      ],
                      "type": "number",
                      "description": "Forbidden error code.",
                      "example": 403
                    },
                    "error": {
                      "type": "string",
                      "description": "Short error title.",
                      "example": "Forbidden"
                    }
                  },
                  "required": [
                    "message",
                    "error"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Internal server error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "statusCode": {
                      "enum": [
                        500
                      ],
                      "type": "number",
                      "description": "HTTP status code.",
                      "example": 500
                    },
                    "message": {
                      "description": "Internal server error message.",
                      "oneOf": [
                        {
                          "type": "string"
                        },
                        {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      ],
                      "example": "Internal Server Error"
                    },
                    "error": {
                      "type": "string",
                      "description": "Short error title.",
                      "example": "Internal Server Error"
                    }
                  },
                  "required": [
                    "statusCode",
                    "message",
                    "error"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Promotions Open Api"
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
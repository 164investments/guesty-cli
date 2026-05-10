# Assign Properties to a Promotion.

Assigns properties to participate in a promotion.

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
    "/rm-promotions/promotions/{promotionId}/assign": {
      "put": {
        "operationId": "PromotionController_assignListings",
        "summary": "Assign Properties to a Promotion.",
        "description": "Assigns properties to participate in a promotion.",
        "parameters": [
          {
            "name": "promotionId",
            "required": true,
            "in": "path",
            "description": "The promotion ID.",
            "schema": {
              "example": "63ee4b7e459ca31532f",
              "type": "string"
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
                  "listings": {
                    "description": "Listings to assign.",
                    "example": [
                      "63ee4b7e459ca31532f",
                      "63ee4b7e459ca31532f"
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {}
                    }
                  }
                },
                "required": [
                  "listings"
                ]
              }
            }
          }
        },
        "responses": {
          "202": {
            "description": "Request for assigning properties to the promotion has been accepted and is being processed.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "requestId": {
                      "type": "string",
                      "description": "Id of request.",
                      "example": "123e4567-e89b-12d3-a456-426614174000"
                    },
                    "promotionId": {
                      "type": "string",
                      "description": "Id of promotion.",
                      "example": "63ee4b7e459ca31532f"
                    },
                    "assignedListingIds": {
                      "description": "Assigned listings in this request.",
                      "example": [
                        "63ee4b7e459ca31532f",
                        "63ee4b7e459ca31532f"
                      ],
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {}
                      }
                    }
                  },
                  "required": [
                    "requestId",
                    "promotionId",
                    "assignedListingIds"
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
          "404": {
            "description": "Promotion was not found.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "description": "Not found error message.",
                      "example": "Not Found"
                    },
                    "code": {
                      "enum": [
                        404
                      ],
                      "type": "number",
                      "description": "Not found error code.",
                      "example": 404
                    },
                    "error": {
                      "type": "string",
                      "description": "Short error title.",
                      "example": "Not Found"
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
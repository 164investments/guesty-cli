# Set ownerships to listing

Set ownerships to listing

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
      "name": "Ownerships"
    }
  ],
  "paths": {
    "/owners/listings/{listingId}/ownerships": {
      "put": {
        "operationId": "ListingOwnershipsOpenApiController_set",
        "summary": "Set ownerships to listing",
        "description": "Set ownerships to listing",
        "parameters": [
          {
            "name": "listingId",
            "required": true,
            "in": "path",
            "description": "Listing id",
            "schema": {
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
                  "ownerships": {
                    "description": "ownerships list",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "ownerId": {
                          "type": "string",
                          "description": "Owner Id"
                        },
                        "share": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100,
                          "description": "Owner share in percentage",
                          "example": 40.5
                        }
                      },
                      "required": [
                        "ownerId",
                        "share"
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "accountId": {
                      "type": "string"
                    },
                    "listingId": {
                      "type": "string"
                    },
                    "ownerships": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "ownerId": {
                            "type": "string"
                          },
                          "share": {
                            "type": "number"
                          }
                        },
                        "required": [
                          "ownerId",
                          "share"
                        ]
                      }
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "updatedAt": {
                      "format": "date-time",
                      "type": "string"
                    }
                  },
                  "required": [
                    "accountId",
                    "listingId",
                    "ownerships",
                    "createdAt",
                    "updatedAt"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "",
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
                          "example": "Validation Failed Error"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "enum": [
                            100,
                            101,
                            102,
                            103,
                            200,
                            201,
                            202,
                            203,
                            204,
                            205,
                            206,
                            300,
                            301,
                            302,
                            303,
                            304,
                            307,
                            308,
                            400,
                            401,
                            402,
                            403,
                            404,
                            405,
                            406,
                            407,
                            408,
                            409,
                            410,
                            411,
                            412,
                            413,
                            414,
                            415,
                            416,
                            417,
                            418,
                            421,
                            422,
                            424,
                            428,
                            429,
                            500,
                            501,
                            502,
                            503,
                            504,
                            505
                          ],
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "property1 must not be less than 0",
                            "property1 must be an integer number"
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
          }
        },
        "tags": [
          "Ownerships"
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
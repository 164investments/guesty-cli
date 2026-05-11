# Create a document

Create a document

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
      "name": "Owners Documents"
    }
  ],
  "paths": {
    "/owners/{ownerId}/documents": {
      "post": {
        "operationId": "DocumentsOpenApiController_create",
        "summary": "Create a document",
        "description": "Create a document",
        "parameters": [
          {
            "name": "ownerId",
            "required": true,
            "in": "path",
            "description": "Owner id",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "description": "Document in pdf format, maximum size 5 MB",
                    "format": "binary"
                  },
                  "name": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "type": {
                    "type": "string",
                    "default": "DOCUMENT",
                    "description": "Type of the document, defaults to DOCUMENT",
                    "enum": [
                      "DOCUMENT",
                      "CONTRACT",
                      "OWNER1099_COPYB",
                      "OWNER1099_COPY2"
                    ]
                  },
                  "isShared": {
                    "type": "boolean"
                  },
                  "startDate": {
                    "format": "date-time",
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format"
                  },
                  "endDate": {
                    "format": "date-time",
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format"
                  }
                },
                "required": [
                  "file",
                  "name"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string"
                    },
                    "accountId": {
                      "type": "string"
                    },
                    "ownerId": {
                      "type": "string"
                    },
                    "originalFileName": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "type": {
                      "enum": [
                        "DOCUMENT",
                        "CONTRACT",
                        "OWNER1099_COPYB",
                        "OWNER1099_COPY2"
                      ],
                      "type": "string",
                      "example": "DOCUMENT"
                    },
                    "isShared": {
                      "type": "boolean",
                      "description": "Document is visible to owner in Owners Portal"
                    },
                    "startDate": {
                      "type": "string",
                      "description": "Document effective date in YYYY-MM-DD format"
                    },
                    "endDate": {
                      "type": "string",
                      "description": "Document expiration date in YYYY-MM-DD format"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string"
                    },
                    "deletedAt": {
                      "format": "date-time",
                      "type": "string"
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "ownerId",
                    "originalFileName",
                    "name",
                    "type",
                    "isShared",
                    "createdAt"
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
          },
          "413": {
            "description": ""
          },
          "415": {
            "description": ""
          },
          "500": {
            "description": ""
          }
        },
        "tags": [
          "Owners Documents"
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
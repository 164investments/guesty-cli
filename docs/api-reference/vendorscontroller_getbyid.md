# Query a vendor

Get specific vendor by ID

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
    "/vendors/{id}": {
      "get": {
        "operationId": "VendorsController_getById",
        "summary": "Query a vendor",
        "description": "Get specific vendor by ID",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Vendor id to get",
            "schema": {
              "example": "6092061fdeaae7002f92078e",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Vendor response",
            "content": {
              "application/json": {
                "schema": {
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
            "description": "Can't find vendor, by provided ID",
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
                          "type": "number",
                          "example": 404
                        },
                        "data": {
                          "type": "string",
                          "example": "Not Found"
                        }
                      },
                      "required": [
                        "message",
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
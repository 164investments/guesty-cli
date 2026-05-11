# Get property logs

Retrieve logs for a specific property with optional filtering and pagination

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
      "name": "Properties Logs"
    }
  ],
  "paths": {
    "/property-logs/{id}": {
      "get": {
        "operationId": "getPropertyLogs",
        "summary": "Get property logs",
        "description": "Retrieve logs for a specific property with optional filtering and pagination",
        "tags": [
          "Properties Logs"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Property ID (MongoDB ObjectId)",
            "schema": {
              "example": "507f1f77bcf86cd799439011",
              "type": "string"
            }
          },
          {
            "name": "user",
            "required": false,
            "in": "query",
            "description": "Filter by user ID (MongoDB ObjectId)",
            "schema": {
              "example": "",
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": false,
            "in": "query",
            "description": "Filter by updated fields, comma separated",
            "schema": {
              "example": "active,isListed",
              "type": "string"
            }
          },
          {
            "name": "from",
            "required": false,
            "in": "query",
            "description": "Filter logs from this date (ISO 8601 format)",
            "schema": {
              "example": "2024-01-01T00:00:00.000Z",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "description": "Filter logs until this date (ISO 8601 format)",
            "schema": {
              "example": "2024-12-31T23:59:59.999Z",
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Number of logs to return (1-20)",
            "schema": {
              "minimum": 1,
              "maximum": 20,
              "default": 20,
              "example": 10,
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Number of logs to skip for pagination",
            "schema": {
              "minimum": 0,
              "default": 0,
              "example": 0,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the property logs",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string"
                          },
                          "propertyId": {
                            "type": "string"
                          },
                          "accountId": {
                            "type": "string"
                          },
                          "userId": {
                            "type": "string"
                          },
                          "updatedFields": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "updatedAt": {
                            "type": "string"
                          },
                          "updatedBy": {
                            "type": "string"
                          },
                          "oldValue": {
                            "type": "string"
                          },
                          "newValue": {
                            "type": "string"
                          },
                          "propertyType": {
                            "type": "string"
                          },
                          "updateSubUnits": {
                            "type": "boolean"
                          }
                        }
                      }
                    },
                    "count": {
                      "type": "number",
                      "example": 25
                    },
                    "limit": {
                      "type": "number",
                      "example": 10
                    },
                    "skip": {
                      "type": "number",
                      "example": 0
                    }
                  },
                  "example": {
                    "results": [
                      {
                        "_id": "68a71b99fde7015cb4c645f2",
                        "propertyId": "68a719f29f30e10011f1b175",
                        "accountId": "596f6fe706112710005d96ff",
                        "userId": "63e3b2108577d63d394c8868",
                        "updatedFields": [
                          "active"
                        ],
                        "updatedAt": "2025-08-21T13:08:25.214Z",
                        "updatedBy": "Authz Admin",
                        "oldValue": "{\"active\":true}",
                        "newValue": "{\"active\":false}",
                        "propertyType": "MTL",
                        "updateSubUnits": true
                      },
                      {
                        "_id": "68a71af2fde7015cb4c645f0",
                        "propertyId": "68a719f29f30e10011f1b175",
                        "accountId": "596f6fe706112710005d96ff",
                        "userId": "63e3b2108577d63d394c8868",
                        "updatedFields": [
                          "isListed"
                        ],
                        "updatedAt": "2025-08-20T13:08:25.214Z",
                        "updatedBy": "Authz Admin",
                        "oldValue": "{\"isListed\":true}",
                        "newValue": "{\"isListed\":false}",
                        "propertyType": "MTL",
                        "updateSubUnits": true
                      }
                    ],
                    "count": 25,
                    "limit": 2,
                    "skip": 0
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid parameters or validation error",
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
                        },
                        "data": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "message": "Bad Request",
                    "code": "VALIDATION_FAILED",
                    "status": 400,
                    "data": [
                      "userId must be a mongodb id"
                    ]
                  }
                }
              }
            }
          },
          "404": {
            "description": "Property not found",
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
                        "data": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "example": {
                    "message": "Not Found",
                    "status": 404,
                    "data": "Property was not found"
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
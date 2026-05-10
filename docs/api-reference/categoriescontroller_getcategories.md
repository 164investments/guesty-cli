# Get categories list


        Retrieve a paginated list of categories with optional filtering.
        Supports filtering by name.
      

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
    "/accounting-api/categories": {
      "get": {
        "operationId": "CategoriesController_getCategories",
        "summary": "Get categories list",
        "description": "\n        Retrieve a paginated list of categories with optional filtering.\n        Supports filtering by name.\n      ",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "name": "q",
            "required": false,
            "in": "query",
            "description": "Filter by category name",
            "schema": {
              "example": "Office",
              "type": "string"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Pagination skip value",
            "schema": {
              "minimum": 0,
              "default": 0,
              "example": 0,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Pagination limit value",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "example": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of categories with pagination information",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "skip": {
                      "type": "number",
                      "example": 0
                    },
                    "limit": {
                      "type": "number",
                      "example": 25
                    },
                    "current": {
                      "type": "number",
                      "example": 25
                    },
                    "total": {
                      "type": "number",
                      "example": 478
                    },
                    "data": {
                      "description": "List of categories",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "description": "Category UUID",
                            "example": "123e4567-e89b-12d3-a456-426614174000"
                          },
                          "name": {
                            "type": "string",
                            "description": "Category name",
                            "example": "Office Supplies"
                          },
                          "createdByUser": {
                            "description": "User who created the category. For regular users: { id: \"5d6e7a7ebf8e3800207735ae\", name: \"John Doe\" }. For system: { id: \"guesty\", name: \"Guesty\" }",
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "id": {
                                    "type": "string",
                                    "description": "Creator user ID",
                                    "example": "5d6e7a7ebf8e3800207735ae"
                                  },
                                  "name": {
                                    "type": "string",
                                    "description": "Creator user name",
                                    "example": "John Doe"
                                  }
                                },
                                "required": [
                                  "id"
                                ]
                              }
                            ]
                          }
                        },
                        "required": [
                          "id",
                          "name",
                          "createdByUser"
                        ]
                      }
                    }
                  },
                  "required": [
                    "skip",
                    "limit",
                    "current",
                    "total",
                    "data"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid query parameters provided",
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
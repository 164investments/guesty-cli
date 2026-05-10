# Get expenses with filtering

Retrieves expenses with optional filtering and pagination.

Filters by status (comma-separated), category, vendor, owner, listing, reservation IDs, and date ranges.

Returns up to 100 items per page. Defaults to 50 items, sorted by creation date descending.

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
      "name": "Expenses (only available for accounting add-on users)"
    }
  ],
  "paths": {
    "/expenses-api/expenses": {
      "get": {
        "operationId": "ExpensesController_getExpenses",
        "summary": "Get expenses with filtering",
        "description": "Retrieves expenses with optional filtering and pagination.\n\nFilters by status (comma-separated), category, vendor, owner, listing, reservation IDs, and date ranges.\n\nReturns up to 100 items per page. Defaults to 50 items, sorted by creation date descending.",
        "tags": [
          "Expenses (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "name": "status",
            "required": false,
            "in": "query",
            "description": "Comma-separated expense statuses to filter by. Valid values: scheduled, submitted, insufficient_funds, paid, canceled",
            "schema": {
              "enum": [
                "scheduled",
                "submitted",
                "insufficient_funds",
                "paid",
                "canceled"
              ],
              "type": "string"
            }
          },
          {
            "name": "categoryId",
            "required": false,
            "in": "query",
            "description": "Category ID to filter expenses by",
            "schema": {
              "example": "123e4567-e89b-12d3-a456-426614174000",
              "type": "string"
            }
          },
          {
            "name": "vendorId",
            "required": false,
            "in": "query",
            "description": "Vendor ID to filter expenses by (MongoDB ObjectId)",
            "schema": {
              "example": "68187ca2a50537610c0a3af2",
              "type": "string"
            }
          },
          {
            "name": "ownerId",
            "required": false,
            "in": "query",
            "description": "Owner ID to filter expenses by (MongoDB ObjectId)",
            "schema": {
              "example": "68187ca2a50537610c0a3af3",
              "type": "string"
            }
          },
          {
            "name": "listingId",
            "required": false,
            "in": "query",
            "description": "Listing ID to filter expenses by (MongoDB ObjectId)",
            "schema": {
              "example": "68187ca2a50537610c0a3af4",
              "type": "string"
            }
          },
          {
            "name": "reservationId",
            "required": false,
            "in": "query",
            "description": "Reservation ID to filter expenses by (MongoDB ObjectId)",
            "schema": {
              "example": "68187ca2a50537610c0a3af5",
              "type": "string"
            }
          },
          {
            "name": "expenseRuleId",
            "required": false,
            "in": "query",
            "description": "Expense Rule ID to filter expenses by",
            "schema": {
              "example": "123e4567-e89b-12d3-a456-426614174005",
              "type": "string"
            }
          },
          {
            "name": "expenseDateFrom",
            "required": false,
            "in": "query",
            "description": "Filter expenses from this date (inclusive, ISO date format)",
            "schema": {
              "example": "2024-01-01",
              "type": "string"
            }
          },
          {
            "name": "expenseDateTo",
            "required": false,
            "in": "query",
            "description": "Filter expenses to this date (inclusive, ISO date format)",
            "schema": {
              "example": "2024-01-31",
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Number of expenses to return (1-100)",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 50,
              "example": 50,
              "type": "number"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Number of expenses to skip for pagination",
            "schema": {
              "minimum": 0,
              "default": 0,
              "example": 0,
              "type": "number"
            }
          },
          {
            "name": "sortBy",
            "required": false,
            "in": "query",
            "description": "Field to sort expenses by",
            "schema": {
              "enum": [
                "expenseDate",
                "createdAt",
                "amount"
              ],
              "type": "string"
            }
          },
          {
            "name": "sortOrder",
            "required": false,
            "in": "query",
            "description": "Sort order for the results",
            "schema": {
              "enum": [
                "ASC",
                "DESC"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated response with filtered expenses, total count, and pagination metadata",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "description": "Array of filtered expenses for the current page",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "attachments": {
                            "description": "Array of expense attachments",
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "url": {
                                  "type": "string"
                                },
                                "urlThumbnail": {
                                  "type": "string"
                                },
                                "publicId": {
                                  "type": "string"
                                },
                                "originalExtension": {
                                  "type": "string"
                                },
                                "originalFilename": {
                                  "type": "string"
                                },
                                "bytes": {
                                  "type": "number",
                                  "minimum": 1
                                },
                                "id": {
                                  "type": "number"
                                }
                              },
                              "required": [
                                "url",
                                "originalExtension",
                                "originalFilename"
                              ]
                            }
                          },
                          "id": {
                            "type": "string"
                          },
                          "customerAccountId": {
                            "type": "string"
                          },
                          "currentVersionId": {
                            "type": "number"
                          },
                          "createdBy": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string"
                          },
                          "createdAt": {
                            "format": "date-time",
                            "type": "string"
                          },
                          "updatedAt": {
                            "format": "date-time",
                            "type": "string"
                          },
                          "vendorId": {
                            "type": "string"
                          },
                          "currency": {
                            "type": "string"
                          },
                          "listingId": {
                            "type": "string"
                          },
                          "ownerId": {
                            "type": "string"
                          },
                          "taskId": {
                            "type": "string"
                          },
                          "reservationId": {
                            "type": "string"
                          },
                          "expenseRuleId": {
                            "type": "string"
                          },
                          "originType": {
                            "type": "string"
                          },
                          "name": {
                            "type": "string"
                          },
                          "categoryId": {
                            "type": "string"
                          },
                          "description": {
                            "type": "string"
                          },
                          "expenseRuleShare": {
                            "type": "array",
                            "items": {
                              "type": "object"
                            }
                          },
                          "taxCategoryCode": {
                            "type": "string"
                          },
                          "taxName": {
                            "type": "string"
                          },
                          "taxDescription": {
                            "type": "string"
                          },
                          "taxPayeeTypes": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "enum": [
                                "VENDOR",
                                "PMC",
                                "OWNER"
                              ]
                            }
                          },
                          "externalRefId": {
                            "type": "string"
                          },
                          "currentVersion": {
                            "type": "object",
                            "properties": {
                              "amount": {
                                "type": "number"
                              },
                              "expenseDate": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "status": {
                                "type": "string"
                              },
                              "taxAmount": {
                                "type": "number"
                              }
                            },
                            "required": [
                              "amount",
                              "expenseDate",
                              "status"
                            ]
                          }
                        },
                        "required": [
                          "id",
                          "customerAccountId",
                          "type",
                          "createdAt",
                          "updatedAt",
                          "currency",
                          "originType",
                          "name",
                          "categoryId"
                        ]
                      }
                    },
                    "count": {
                      "type": "number",
                      "description": "Total number of expenses matching the filter criteria",
                      "example": 147
                    },
                    "limit": {
                      "type": "number",
                      "description": "Number of expenses returned in this response (max items per page)",
                      "example": 50
                    },
                    "skip": {
                      "type": "number",
                      "description": "Number of expenses skipped (for pagination)",
                      "example": 0
                    }
                  },
                  "required": [
                    "data",
                    "count",
                    "limit",
                    "skip"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Authentication required - invalid or missing token",
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
                        }
                      },
                      "required": [
                        "message",
                        "code",
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
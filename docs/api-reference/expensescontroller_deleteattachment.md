# Delete attachment from expense

Deletes a single attachment from an existing expense by its attachment ID.

Returns the updated expense after the attachment is removed.

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
    "/expenses-api/expenses/{id}/attachments/{attachmentId}": {
      "delete": {
        "operationId": "ExpensesController_deleteAttachment",
        "summary": "Delete attachment from expense",
        "description": "Deletes a single attachment from an existing expense by its attachment ID.\n\nReturns the updated expense after the attachment is removed.",
        "tags": [
          "Expenses (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Expense ID (UUID)",
            "schema": {
              "example": "67890123-e89b-12d3-a456-426614174000",
              "type": "string"
            }
          },
          {
            "name": "attachmentId",
            "required": true,
            "in": "path",
            "description": "Attachment ID (string)",
            "schema": {
              "example": "12345",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Attachment successfully deleted from expense",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "description": "Expense details",
                      "allOf": [
                        {
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
                      ]
                    }
                  },
                  "required": [
                    "data"
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
          "404": {
            "description": "Expense or attachment not found",
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
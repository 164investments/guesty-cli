# Add attachments to expense

Adds one or more attachments to an existing expense without replacing previously added ones.

Accepts up to 10 attachments per request. Each attachment requires: url, urlThumbnail, extension, and fileName.

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
    "/expenses-api/expenses/{id}/attachments": {
      "post": {
        "operationId": "ExpensesController_addAttachments",
        "summary": "Add attachments to expense",
        "description": "Adds one or more attachments to an existing expense without replacing previously added ones.\n\nAccepts up to 10 attachments per request. Each attachment requires: url, urlThumbnail, extension, and fileName.",
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
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "attachments": {
                    "maxItems": 10,
                    "description": "Array of attachments to add to the expense (maximum 10)",
                    "example": [
                      {
                        "url": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx",
                        "urlThumbnail": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx",
                        "extension": "pdf",
                        "fileName": "receipt.pdf"
                      }
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "url": {
                          "type": "string",
                          "maxLength": 2048,
                          "format": "uri",
                          "description": "URL to CDN where attachment is stored. Max length is 2048 characters",
                          "example": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx"
                        },
                        "urlThumbnail": {
                          "type": "string",
                          "maxLength": 2048,
                          "format": "uri",
                          "description": "URL to CDN where attachment thumbnail is stored. Max length is 2048 characters",
                          "example": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx"
                        },
                        "extension": {
                          "type": "string",
                          "maxLength": 10,
                          "description": "Attachment file extension. Max length is 10 characters",
                          "example": "png"
                        },
                        "fileName": {
                          "type": "string",
                          "maxLength": 255,
                          "description": "Attachment file name. Max length is 255 characters",
                          "example": "Invoice copy"
                        }
                      },
                      "required": [
                        "url",
                        "urlThumbnail",
                        "extension",
                        "fileName"
                      ]
                    }
                  }
                },
                "required": [
                  "attachments"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Attachments successfully added to expense",
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
          "400": {
            "description": "Invalid input data - validation errors in request body",
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
                            "title must be longer than or equal to 3 characters",
                            "entries.0.amount should not be empty",
                            "entries.0.destination.type must be a valid enum value"
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
            "description": "Expense not found",
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
# Create expense

Creates a new manual expense.

Validates the expense date against the lock period and rejects creation if the date is locked.

Required fields: name, expenseDate, categoryId, chargeableAmount, currency, paymentShareAmountType, revenueShareAmountType, shares, and shareOption. Either owners or listingIds must be provided (mutually exclusive).

Type (`owner_charge` or `pmc_expense`) is optional. If omitted, it is derived from the shares array: `PMC_EXPENSE` when PMC pays (or both `PMC` and `Owner` pay), `OWNER_CHARGE` when only `Owner` pays. If provided, it must match the calculated type from shares.

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
      "post": {
        "operationId": "ExpensesController_createExpense",
        "summary": "Create expense",
        "description": "Creates a new manual expense.\n\nValidates the expense date against the lock period and rejects creation if the date is locked.\n\nRequired fields: name, expenseDate, categoryId, chargeableAmount, currency, paymentShareAmountType, revenueShareAmountType, shares, and shareOption. Either owners or listingIds must be provided (mutually exclusive).\n\nType (`owner_charge` or `pmc_expense`) is optional. If omitted, it is derived from the shares array: `PMC_EXPENSE` when PMC pays (or both `PMC` and `Owner` pay), `OWNER_CHARGE` when only `Owner` pays. If provided, it must match the calculated type from shares.",
        "tags": [
          "Expenses (only available for accounting add-on users)"
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "type": {
                    "enum": [
                      "owner_charge",
                      "pmc_expense"
                    ],
                    "type": "string",
                    "example": "owner_charge",
                    "description": "Expense type. If not provided, will be automatically calculated from shares array. If provided, must match the calculated type from shares."
                  },
                  "name": {
                    "type": "string",
                    "maxLength": 255,
                    "example": "Full feat Exp Rule"
                  },
                  "expenseDate": {
                    "type": "string",
                    "example": "2025-05-16",
                    "description": "Date of the expense in ISO 8601 format (YYYY-MM-DD)"
                  },
                  "categoryId": {
                    "type": "string",
                    "example": "091b9801-e66f-4bcc-bca7-69536e18bc1d"
                  },
                  "description": {
                    "type": "string",
                    "maxLength": 255,
                    "example": "Example description"
                  },
                  "chargeableAmount": {
                    "type": "number",
                    "example": 20
                  },
                  "currency": {
                    "type": "string",
                    "maxLength": 3,
                    "example": "USD"
                  },
                  "paymentShareAmountType": {
                    "enum": [
                      "fixed",
                      "percent"
                    ],
                    "type": "string",
                    "example": "fixed"
                  },
                  "revenueShareAmountType": {
                    "enum": [
                      "fixed",
                      "percent"
                    ],
                    "type": "string",
                    "example": "percent"
                  },
                  "taxCategoryCode": {
                    "enum": [
                      "vat",
                      "gst"
                    ],
                    "type": "string",
                    "example": "vat",
                    "description": "Legacy; prefer taxCategoryId when specifying tax category."
                  },
                  "taxCategoryId": {
                    "type": "string",
                    "example": "091b9801-e66f-4bcc-bca7-69536e18bc1d"
                  },
                  "taxName": {
                    "type": "string",
                    "maxLength": 255,
                    "example": "VAT test"
                  },
                  "taxDescription": {
                    "type": "string",
                    "maxLength": 255,
                    "example": "Value Added Tax"
                  },
                  "taxAmountType": {
                    "type": "string",
                    "enum": [
                      "percent"
                    ],
                    "example": "percent"
                  },
                  "taxAmount": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "example": 0.2,
                    "description": "Tax amount as a decimal between 0 and 1 (e.g., 0.2 for 20%)"
                  },
                  "taxPayeeTypes": {
                    "uniqueItems": true,
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "VENDOR",
                        "PMC",
                        "OWNER"
                      ]
                    },
                    "description": "Business entity types that pay the tax (e.g., [\"OWNER\"], [\"OWNER\", \"PMC\"])",
                    "example": [
                      "OWNER"
                    ]
                  },
                  "isPmcAsVendor": {
                    "type": "boolean",
                    "example": true
                  },
                  "vendorId": {
                    "type": "string",
                    "example": "67d16b88b962316b4b888afb"
                  },
                  "reservationId": {
                    "type": "string",
                    "example": "67d16b88b962316b4b888afb"
                  },
                  "externalRefId": {
                    "type": "string",
                    "maxLength": 255,
                    "description": "A unique identifier that serves as a reference to an external object. This ID can be used to link the current resource to a related entity in another system",
                    "example": "EXT-REF-12345"
                  },
                  "owners": {
                    "description": "Required when `listingIds` property is not in use. Can only be provided when OWNER has a payment share in the shares array.",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "ownerId": {
                          "type": "string",
                          "example": "some id"
                        },
                        "listingId": {
                          "type": "string"
                        }
                      },
                      "required": [
                        "ownerId"
                      ]
                    }
                  },
                  "listingIds": {
                    "example": [
                      "67d16b88b962316b4b888afb"
                    ],
                    "description": "Required when `owners` property is not in use. Each item must be a valid MongoDB ObjectId.",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "shares": {
                    "uniqueItems": true,
                    "example": [
                      {
                        "type": "payment",
                        "businessEntityType": "OWNER",
                        "share": 1
                      },
                      {
                        "type": "revenue",
                        "businessEntityType": "PMC",
                        "share": 0.3
                      },
                      {
                        "type": "revenue",
                        "businessEntityType": "VENDOR",
                        "share": 0.7
                      }
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "type": {
                          "enum": [
                            "revenue",
                            "payment"
                          ],
                          "type": "string",
                          "example": "payment"
                        },
                        "businessEntityType": {
                          "enum": [
                            "OWNER",
                            "GUEST",
                            "PMC",
                            "VENDOR",
                            "CHANNEL",
                            "GOV"
                          ],
                          "type": "string",
                          "example": "OWNER"
                        },
                        "share": {
                          "type": "number",
                          "example": 0.5,
                          "description": "Share value for percentage between 0 and 1. For fixed any value"
                        }
                      },
                      "required": [
                        "type",
                        "businessEntityType",
                        "share"
                      ]
                    }
                  },
                  "shareOption": {
                    "enum": [
                      "pmc_pays_to_vendor",
                      "owner_pays_to_vendor",
                      "pmc_and_owner_pay_to_vendor",
                      "owner_pays_to_pmc_and_vendor",
                      "owner_pays_to_pmc"
                    ],
                    "type": "string",
                    "example": "owner_pays_to_pmc"
                  },
                  "attachments": {
                    "description": "Array of expense attachments",
                    "example": [
                      {
                        "url": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx",
                        "urlThumbnail": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx",
                        "extension": "png",
                        "fileName": "Invoice copy"
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
                  "name",
                  "expenseDate",
                  "categoryId",
                  "chargeableAmount",
                  "currency",
                  "paymentShareAmountType",
                  "revenueShareAmountType",
                  "shares",
                  "shareOption"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created expense(s) wrapped in a data array",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "description": "Array of expense details",
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
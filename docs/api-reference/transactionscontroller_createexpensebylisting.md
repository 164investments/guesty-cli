# Create expense by listing

Create an expense for the provided listing. This will apply to all owners unless you include a given ownerId.

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
    "/business-models-api/transactions/expenses-by-listing": {
      "post": {
        "operationId": "TransactionsController_createExpenseByListing",
        "summary": "Create expense by listing",
        "description": "Create an expense for the provided listing. This will apply to all owners unless you include a given ownerId.",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "description": "Expense name",
                    "example": "Maintenance expense",
                    "maxLength": 255
                  },
                  "category": {
                    "type": "string",
                    "description": "Charge category",
                    "enum": [
                      "advertising",
                      "cleaning",
                      "damage_waiver",
                      "electricity",
                      "furniture_appliances",
                      "gas",
                      "internet",
                      "lock_automation",
                      "management",
                      "mortgage",
                      "pest_control",
                      "pool_cleaning",
                      "property_taxes",
                      "repairs_maintenance",
                      "supplies_purchases",
                      "other_misc",
                      "taxes_paid",
                      "telephone",
                      "television",
                      "trash",
                      "water_septic",
                      "guest_cleaning",
                      "owner_cleaning",
                      "channel_commission",
                      "payment_charge",
                      "pet_fee",
                      "startup_fee",
                      "fotoshoot",
                      "vat",
                      "gst",
                      "insurance",
                      "monitoring_surveillance",
                      "garden_maintenance",
                      "jacuzzi_maintenance",
                      "sauna_maintenance",
                      "photoshoot",
                      "bank_fees",
                      "sta_licensing",
                      "security",
                      "laundry",
                      "listing_fee",
                      "gardening",
                      "guest_compensation",
                      "home_improvement",
                      "other_expenses",
                      "other_income",
                      "other_services_ops_assistants",
                      "painting",
                      "plumbing",
                      "refund",
                      "refund_security_deposit",
                      "rubbish_removal_service",
                      "set_up_fee",
                      "strata_rates",
                      "security_deposit"
                    ]
                  },
                  "categoryId": {
                    "type": "string",
                    "description": "You can get your Category ID [here](/reference/categoriescontroller_getcategories)",
                    "example": "123e4567-e89b-12d3-a456-426614174000"
                  },
                  "description": {
                    "type": "string",
                    "description": "Expense description. Max length is 255 characters",
                    "example": "Bulb replacement",
                    "maxLength": 255
                  },
                  "amount": {
                    "type": "number",
                    "description": "Expense amount, account currency will be used",
                    "example": 5
                  },
                  "recognitionDate": {
                    "type": "string",
                    "description": "Expense recognition date in the account timezone. ISO 8601 Date format (year-month-day)",
                    "example": "2023-10-27"
                  },
                  "vendorId": {
                    "type": "string",
                    "description": "You can get your vendor ID [here](/reference/vendorscontroller_getall)",
                    "example": "5f4f6e1c1c6e4e001f7e8b4e"
                  },
                  "referenceId": {
                    "type": "string",
                    "description": "A unique identifier that serves as a reference to an external object. This ID can be used to link the current resource to a related entity in another system",
                    "example": "REF-12345",
                    "maxLength": 255
                  },
                  "expenseShare": {
                    "description": "Share expense between PMC and Owner, by default 100% is going to PMC",
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "shareSplit": {
                            "type": "number",
                            "description": "A share split is a floating point number that represents the percentage. For example, \n      - `0.5` means that the share is 50% between PMC and Owner.\n      - `0.1` means that the share is 10% Owner and 90% PMC.\n      - `0` means that the charge covered 100% by PMC.",
                            "example": 0.5
                          },
                          "ownerId": {
                            "type": "string",
                            "description": "You can get your owner ID [here](/reference/get_owners)",
                            "example": "67166b173907ef3b9bf25fb3"
                          },
                          "listingId": {
                            "type": "string",
                            "description": "You can get your listing ID [here](/reference/get_listings)",
                            "example": "507f191e810c19729de860ea"
                          }
                        },
                        "required": [
                          "shareSplit",
                          "listingId"
                        ]
                      }
                    ]
                  },
                  "attachments": {
                    "description": "Add attachments to expense",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "url": {
                          "type": "string",
                          "description": "URL to CDN where attachment is stored. Max length is 2048 characters",
                          "example": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx"
                        },
                        "urlThumbnail": {
                          "type": "string",
                          "description": "URL to CDN where attachment thumbnail is stored. Max length is 2048 characters",
                          "example": "https://cdn.filepicker.io/api/file/bBnKEk8TlmJAUHcLApRx"
                        },
                        "extension": {
                          "type": "string",
                          "description": "Attachment file extension. Max length is 10 characters",
                          "example": "png"
                        },
                        "fileName": {
                          "type": "string",
                          "description": "Attachment file name. Max length is 255 characters",
                          "example": "Invoice copy",
                          "maxLength": 255
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
                  "description",
                  "amount",
                  "recognitionDate",
                  "vendorId"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Expense created"
          },
          "400": {
            "description": "Input data is not valid",
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
            "description": "Accounting feature flow disabled",
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
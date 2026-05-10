# Get all journal entries

Retrieves all journal entries matching the specified parameters

# OpenAPI definition

````json
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
    "/accounting-api/journal-entries/all": {
      "get": {
        "operationId": "JournalEntriesController_getAll",
        "summary": "Get all journal entries",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "description": "Retrieves all journal entries matching the specified parameters",
        "parameters": [
          {
            "name": "transactionDate",
            "required": true,
            "in": "query",
            "description": "DO NOT use the format provided in the coding playground output.\n    Fields in this query param must be transformed according to the rules explained below.\n    For example, in order to fetch the information for past 7 days:\n1. Form your object first\n```json\n{\n  \"operator\": \"@in_past_days\",\n  \"value\": 7\n}\n```\n\n2. Then encode it to sanitized URL (see the code example written in JS below)\n```js\nencodeURIComponent(JSON.stringify({\"operator\": \"@in_past_days\", \"value\": 7}))\n```\n\n3. The final query param structure should be looked like\n```\ntransactionDate=%7B%22operator%22%3A%22%40in_past_days%22%2C%22value%22%3A7%7D\n```\n",
            "examples": {
              "on": {
                "value": {
                  "operator": "@on",
                  "value": "2024-07-03"
                }
              },
              "past-7-days": {
                "value": {
                  "operator": "@in_past_days",
                  "value": 7
                }
              },
              "in-future": {
                "value": {
                  "operator": "@in_future",
                  "value": true
                }
              }
            },
            "schema": {
              "type": "object",
              "properties": {
                "operator": {
                  "enum": [
                    "@in_future",
                    "@in_past",
                    "@in_next_days",
                    "@is_after_days",
                    "@in_past_days",
                    "@is_before_days",
                    "@on",
                    "@between",
                    "@lt",
                    "@today"
                  ],
                  "type": "string",
                  "description": "Comparison operator",
                  "example": "@in_past_days"
                },
                "value": {
                  "description": "List of available date operators:\n  - `@in_future` - boolean value,\n    Example: `{ \"operator\": \"@in_future\", \"value\": true }`\n  - `@in_past` - boolean value,\n    Example: `{ \"operator\": \"@in_past\", \"value\": true }`\n  - `@in_next_days` - numeric value,\n    Example: `{ \"operator\": \"@in_next_days\", \"value\": 2 }`\n  - `@is_after_days` - numeric value,\n    Example: `{ \"operator\": \"@is_after_days\", \"value\": 2 }`\n  - `@in_past_days` - numeric value,\n    Example: `{ \"operator\": \"@in_past_days\", \"value\": 2 }`\n  - `@is_before_days` - numeric value,\n    Example: `{ \"operator\": \"@is_before_days\", \"value\": 2 }`\n  - `@on` - Date string value,\n    Example: `{ \"operator\": \"@on\", \"value\": \"2022-07-03T12:00:00+03:00\" }`\n  - `@between` - array of two Date string values,\n    Example: `{ \"operator\": \"@between\", \"value\": [\"2022-07-03T12:00:00+03:00\", \"2022-07-08T12:00:00+03:00\"] }`\n  - `@lt` - Date string value,\n    Example: `{ \"operator\": \"@lt\", \"value\": \"2022-07-03T12:00:00+03:00\" }}`\n  - `@gte` - Date string value,\n    Example: `{ \"operator\": \"@gte\", \"value\": \"2022-07-03T12:00:00+03:00\" }}`\n  - `@today` - boolean value,\n    Example: `{ \"operator\": \"@today\", \"value\": true }`",
                  "oneOf": [
                    {
                      "title": "yyyy-MM-dd",
                      "description": "Supported by `@gte`, `@lt`, `@on` operators",
                      "type": "string",
                      "example": "2024-07-03"
                    },
                    {
                      "title": "true",
                      "description": "Supported by `@today`, `@is_before_days`, `@in_past`, `@in_future` operators. Only `true` is acceptable",
                      "type": "boolean",
                      "example": true
                    },
                    {
                      "title": "Numeric",
                      "description": "Supported by `@is_before_days`, `@in_past_days`, `@is_after_days`, `@in_next_days` operators",
                      "type": "number",
                      "example": 7
                    },
                    {
                      "title": "Between",
                      "description": "Supported only by `@between` operator in array format `[\"2024-07-03\", \"2024-07-10\"]`",
                      "type": "array",
                      "maxItems": 2,
                      "items": {
                        "type": "string",
                        "example": [
                          "2024-07-03",
                          "2024-07-10"
                        ]
                      }
                    }
                  ]
                }
              },
              "required": [
                "operator",
                "value"
              ]
            }
          },
          {
            "name": "name",
            "required": false,
            "in": "query",
            "description": "Filter list by journal entries name, it will search by matching strings from filter input",
            "schema": {
              "example": "LOCAL_TAX",
              "type": "string"
            }
          },
          {
            "name": "description",
            "required": false,
            "in": "query",
            "description": "Filter list by journal entries description, it will search by matching strings from filter input",
            "schema": {
              "example": "Deducted commission",
              "type": "string"
            }
          },
          {
            "name": "reservationConfirmationCodes",
            "required": false,
            "in": "query",
            "description": "Filter by reservation confirmation codes",
            "schema": {
              "example": [
                "GY-pzNAXYcq",
                "GY-ndGzwrgF"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "ledger",
            "required": false,
            "in": "query",
            "description": "Filter by ledger type.\nAvailable ledgers: \n - AD  (Advanced deposit)\n - AP  (Accounts payable)\n - C   (Cash)\n - O   (Owners)\n - WC  (Working capital)",
            "schema": {
              "example": [
                "C"
              ],
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "AD",
                  "AP",
                  "C",
                  "O",
                  "POA",
                  "DO",
                  "WC"
                ]
              }
            }
          },
          {
            "name": "guests",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected guests ID",
            "schema": {
              "example": [
                "5cfe6449b03278001ee67e03",
                "5f6b5faa6d5ccd28943d0408"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "vendors",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected vendors ID",
            "schema": {
              "example": [
                "62a764a2cecc57003492db6a",
                "airbnb",
                "airbnb2"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "owners",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected owners ID",
            "schema": {
              "example": [
                "62c57651f2e43e00397ca67f",
                "62c2eb8d999ea20033fdac1b"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "listings",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected listings ID",
            "schema": {
              "example": [
                "62c57651f2e43e00397ca67f",
                "62c2eb8d999ea20033fdac1b"
              ],
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "chargeCode",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected transaction codes",
            "schema": {
              "example": [
                "PCM",
                "COT"
              ],
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "AF",
                  "AFO",
                  "CF",
                  "PCM",
                  "CM",
                  "LT",
                  "CT",
                  "TT",
                  "GST",
                  "LGT",
                  "OT",
                  "VAT",
                  "VATOC",
                  "VATOCA",
                  "VATPE",
                  "TAX",
                  "AFE",
                  "CCP",
                  "PR",
                  "RF",
                  "CHB",
                  "CHBRV",
                  "CMS",
                  "OC",
                  "PFO",
                  "OCR",
                  "ODB",
                  "PO",
                  "PV",
                  "FT",
                  "PE",
                  "PI",
                  "CFE",
                  "EXNRI",
                  "CCNRI",
                  "ST",
                  "COT",
                  "OCT",
                  "TOT",
                  "HSHAT",
                  "HST",
                  "MAT",
                  "TRT",
                  "PP",
                  "RCA",
                  "WOCAP",
                  "OCWC",
                  "TAF",
                  "GPC",
                  "RR",
                  "SDC",
                  "SDCP",
                  "AFD",
                  "AFA",
                  "LOSD",
                  "GCD",
                  "AFWD",
                  "AFMD",
                  "EPF",
                  "MAR",
                  "MARF",
                  "MARD",
                  "CO",
                  "PRO",
                  "ARC",
                  "JE"
                ]
              }
            }
          },
          {
            "name": "triggers",
            "required": false,
            "in": "query",
            "description": "Show journal entries for selected triggers. \nAvailable triggers: \n  - PAYMENT\n  - MANUAL\n  - PERIODIC\n  - RESERVATION_CANCELLED\n  - RESERVATION_CREATED\n  - RESERVATION_UPDATED\n  - DISBURSEMENT\n  - RECONCILIATION_CASH_ADJUSTMENT\n",
            "schema": {
              "example": [
                "PAYMENT",
                "MANUAL"
              ],
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "MANUAL",
                  "PAYMENT",
                  "PERIODIC",
                  "RESERVATION_CREATED",
                  "RESERVATION_UPDATED",
                  "RESERVATION_CANCELLED",
                  "DISBURSEMENT",
                  "RECONCILIATION_CASH_ADJUSTMENT",
                  "COMMISSION_ADJUSTMENT",
                  "OPENAPI",
                  "EXPENSES_CSV_IMPORT"
                ]
              }
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Pagination skip value",
            "schema": {
              "minimum": 0,
              "example": 5,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Pagination limit value",
            "schema": {
              "minimum": 0,
              "maximum": 100,
              "example": 10,
              "type": "number"
            }
          },
          {
            "name": "sortByDate",
            "required": false,
            "in": "query",
            "description": "Sort by date. For ascending order use 'ASC' value, for descending - 'DESC'",
            "schema": {
              "example": "ASC",
              "enum": [
                "ASC",
                "DESC"
              ],
              "type": "string"
            }
          },
          {
            "name": "recognized",
            "required": false,
            "in": "query",
            "description": "Filter by recognition status of the transaction",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Journal entries response",
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
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "number",
                            "example": 149304
                          },
                          "transactionId": {
                            "type": "number",
                            "example": 74691
                          },
                          "date": {
                            "type": "string",
                            "example": "2022-07-13"
                          },
                          "description": {
                            "type": "string",
                            "example": "Payment - CASH"
                          },
                          "ledger": {
                            "type": "string",
                            "example": "Advanced deposit"
                          },
                          "guest": {
                            "example": {
                              "id": "62ce5bd737f7d900320e4a47",
                              "name": "Guest Xxx"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "id": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "id",
                                  "name"
                                ]
                              }
                            ]
                          },
                          "vendor": {
                            "example": {
                              "id": "62ce5bd737f7d900320e4a47",
                              "name": "Vendor Xxx"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "id": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "id",
                                  "name"
                                ]
                              }
                            ]
                          },
                          "owner": {
                            "example": {
                              "id": "62ce5bd737f7d900320e4a47",
                              "name": "Owner Xxx"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "id": {
                                    "type": "string"
                                  },
                                  "name": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "id",
                                  "name"
                                ]
                              }
                            ]
                          },
                          "amount": {
                            "example": {
                              "value": -95,
                              "currency": "USD"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "value": {
                                    "type": "number"
                                  },
                                  "currency": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "value",
                                  "currency"
                                ]
                              }
                            ]
                          },
                          "name": {
                            "type": "string",
                            "example": "Payment - CASH"
                          },
                          "listing": {
                            "example": {
                              "href": "/properties/6259630d9e23bc0034c86238",
                              "title": "Dmytro's fancy house",
                              "target": "_blank"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "href": {
                                    "type": "string"
                                  },
                                  "title": {
                                    "type": "string"
                                  },
                                  "target": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "href",
                                  "title",
                                  "target"
                                ]
                              }
                            ]
                          },
                          "chargeType": {
                            "type": "string",
                            "example": "Payment Recording"
                          },
                          "reservationConfirmationCode": {
                            "example": {
                              "href": "/reservations/62ce5bdb37f7d900320e4a69/summary",
                              "title": "Y7MB8NGmA",
                              "target": "_blank"
                            },
                            "allOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "href": {
                                    "type": "string"
                                  },
                                  "title": {
                                    "type": "string"
                                  },
                                  "target": {
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "href",
                                  "title",
                                  "target"
                                ]
                              }
                            ]
                          },
                          "paymentConfirmationCode": {
                            "type": "string",
                            "example": "SAS432"
                          },
                          "chargeCode": {
                            "type": "string",
                            "example": "PR"
                          },
                          "trigger": {
                            "type": "string",
                            "example": "Payment"
                          },
                          "attachments": {
                            "example": {
                              "id": 392,
                              "url": "https://res.cloudinary.com/guesty/image/upload/v1664382837/folder/5213a2d206112710005d96ff/accounting/axcrdnwz7ermpaox1eun.pdf",
                              "urlThumbnail": "https://res.cloudinary.com/guesty/image/upload/h_300/v1664382837/folder/5213a2d206112710005d96ff/accounting/axcrdnwz7ermpaox1eun.jpg",
                              "uploadedBy": "5d64dbdbfc4aae0021bffc1c",
                              "uploadedAt": 1664382837000,
                              "originalFilename": "simple",
                              "originalExtension": "pdf"
                            },
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "number"
                                },
                                "url": {
                                  "type": "string"
                                },
                                "urlThumbnail": {
                                  "type": "string"
                                },
                                "uploadedBy": {
                                  "type": "string"
                                },
                                "uploadedAt": {
                                  "type": "number"
                                },
                                "originalFilename": {
                                  "type": "string"
                                },
                                "originalExtension": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "id",
                                "url",
                                "urlThumbnail",
                                "uploadedBy",
                                "uploadedAt",
                                "originalFilename",
                                "originalExtension"
                              ]
                            }
                          },
                          "recognized": {
                            "type": "boolean",
                            "example": true
                          }
                        },
                        "required": [
                          "id",
                          "transactionId",
                          "date",
                          "description",
                          "ledger",
                          "guest",
                          "vendor",
                          "owner",
                          "amount",
                          "name",
                          "listing",
                          "chargeType",
                          "reservationConfirmationCode",
                          "paymentConfirmationCode",
                          "chargeCode",
                          "trigger",
                          "attachments",
                          "recognized"
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
            "description": "Payload validation failed",
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
````
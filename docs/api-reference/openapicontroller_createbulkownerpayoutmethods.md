# Bulk create owner payout methods

Creates payout methods for multiple owners. Returns per-item success/failure results.

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
      "name": "Payouts"
    }
  ],
  "paths": {
    "/payouts/owners/bulk": {
      "post": {
        "operationId": "OpenApiController_createBulkOwnerPayoutMethods",
        "summary": "Bulk create owner payout methods",
        "description": "Creates payout methods for multiple owners. Returns per-item success/failure results.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "items": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "entityId": {
                          "type": "string"
                        },
                        "payoutMethod": {
                          "type": "object",
                          "properties": {
                            "type": {
                              "type": "string"
                            },
                            "accountHolderName": {
                              "type": "string"
                            },
                            "accountHolderType": {
                              "type": "string"
                            },
                            "bankName": {
                              "type": "string"
                            },
                            "accountNumber": {
                              "type": "string"
                            },
                            "routingNumber": {
                              "type": "string"
                            },
                            "accountType": {
                              "type": "string"
                            },
                            "IBAN": {
                              "type": "string"
                            },
                            "code": {
                              "type": "string"
                            },
                            "abaRoutingNumber": {
                              "type": "string"
                            },
                            "bsbCode": {
                              "type": "string"
                            },
                            "address": {
                              "type": "object",
                              "properties": {
                                "street": {
                                  "type": "string"
                                },
                                "country": {
                                  "type": "string"
                                },
                                "city": {
                                  "type": "string"
                                },
                                "stateProvince": {
                                  "type": "string"
                                },
                                "zipCode": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "street",
                                "country",
                                "city",
                                "stateProvince",
                                "zipCode"
                              ]
                            },
                            "sortCode": {
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "accountHolderName",
                            "bankName",
                            "accountNumber",
                            "accountType",
                            "IBAN",
                            "code"
                          ]
                        }
                      },
                      "required": [
                        "entityId",
                        "payoutMethod"
                      ]
                    }
                  }
                },
                "required": [
                  "items"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Bulk create results (successes and failures per item)",
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
                          "entityId": {
                            "type": "string"
                          },
                          "success": {
                            "type": "boolean"
                          },
                          "payoutMethod": {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string"
                              },
                              "ownerId": {
                                "type": "string"
                              },
                              "accountHolderName": {
                                "type": "string"
                              },
                              "accountHolderType": {
                                "type": "string"
                              },
                              "bankName": {
                                "type": "string"
                              },
                              "accountNumber": {
                                "type": "string"
                              },
                              "routingNumber": {
                                "type": "string"
                              },
                              "accountType": {
                                "type": "string"
                              },
                              "IBAN": {
                                "type": "string"
                              },
                              "code": {
                                "type": "string"
                              },
                              "bsbCode": {
                                "type": "string"
                              },
                              "sortCode": {
                                "type": "string"
                              },
                              "createdAt": {
                                "format": "date-time",
                                "type": "string"
                              },
                              "updatedAt": {
                                "format": "date-time",
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "ownerId",
                              "accountHolderName",
                              "accountHolderType",
                              "bankName",
                              "accountNumber",
                              "routingNumber",
                              "accountType",
                              "IBAN",
                              "code",
                              "bsbCode",
                              "sortCode",
                              "createdAt",
                              "updatedAt"
                            ]
                          },
                          "errorMessage": {
                            "type": "string"
                          }
                        },
                        "required": [
                          "entityId",
                          "success"
                        ]
                      }
                    },
                    "successCount": {
                      "type": "number"
                    },
                    "failureCount": {
                      "type": "number"
                    }
                  },
                  "required": [
                    "results",
                    "successCount",
                    "failureCount"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "Invalid request payload"
          }
        },
        "tags": [
          "Payouts"
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
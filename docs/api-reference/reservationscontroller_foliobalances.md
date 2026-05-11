# Get folio balances


        Get folio balances by reservation ID.
        For each reservation get the accounting folio balances per ledger.
        Balances represent current and future entries.
      

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
    "/accounting-api/reservations/{id}/balance": {
      "get": {
        "operationId": "ReservationsController_folioBalances",
        "summary": "Get folio balances",
        "description": "\n        Get folio balances by reservation ID.\n        For each reservation get the accounting folio balances per ledger.\n        Balances represent current and future entries.\n      ",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Reservation ID",
            "schema": {
              "example": "5d6e7a7ebf8e3800207735ae",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Folio balances response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "currency": {
                      "type": "string"
                    },
                    "balance": {
                      "type": "number"
                    },
                    "ledgers": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "name": {
                            "type": "string"
                          },
                          "balance": {
                            "type": "number"
                          }
                        },
                        "required": [
                          "name",
                          "balance"
                        ]
                      }
                    }
                  },
                  "required": [
                    "currency",
                    "balance",
                    "ledgers"
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
            "description": "Can't find reservation, by provided ID",
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
                          "example": "Can't find reservation with ID {reservation_id}"
                        },
                        "status": {
                          "type": "number",
                          "example": 404
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
# Get owner working capital


        Get latest owner working capital by owner ID.
      

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
    "/accounting-api/owners/{id}/working-capital": {
      "get": {
        "operationId": "OwnersController_retrieve",
        "summary": "Get owner working capital",
        "description": "\n        Get latest owner working capital by owner ID.\n      ",
        "tags": [
          "Accounting (only available for accounting add-on users)"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "Owner ID",
            "schema": {
              "example": "5d6e7a7ebf8e3800207735ae",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Owner working capital response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "workingCapital": {
                      "type": "number",
                      "description": "Current owner's working capital amount",
                      "example": 10
                    }
                  }
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
            "description": "Can't find owner, by provided ID",
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
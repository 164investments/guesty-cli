# Post msg(Send new msg)

Owners conversations do not support airbnb2 module type, messages that sent with platform module type will be sent through Email.

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
      "name": "Inbox Conversations"
    }
  ],
  "paths": {
    "/communication/conversations/{conversationId}/send-message": {
      "post": {
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "tags": [
          "Inbox Conversations"
        ],
        "summary": "Post msg(Send new msg)",
        "description": "Owners conversations do not support airbnb2 module type, messages that sent with platform module type will be sent through Email.",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "module": {
                    "type": "object",
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "`sms`, `email`, `note`, `log`, `whatsapp`, `airbnb2`",
                        "example": "email"
                      },
                      "to": {
                        "type": "array",
                        "items": {},
                        "example": "[example@gmail.com]"
                      },
                      "cc": {
                        "type": "array",
                        "items": {},
                        "example": "[example@gmail.com]"
                      },
                      "bcc": {
                        "type": "array",
                        "items": {},
                        "example": "[example@gmail.com]"
                      }
                    },
                    "required": [
                      "type"
                    ]
                  },
                  "body": {
                    "type": "string",
                    "description": "The message itself",
                    "example": "This is a new message"
                  }
                },
                "required": [
                  "module",
                  "body"
                ]
              }
            }
          }
        },
        "parameters": [
          {
            "name": "conversationId",
            "in": "path",
            "schema": {
              "type": "string"
            },
            "required": true,
            "description": "Saved Conversation Id",
            "example": "615997c2e74f61003015ab02"
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 14:01:33 GMT"
                }
              },
              "Content-Type": {
                "schema": {
                  "type": "string",
                  "example": "application/json; charset=utf-8"
                }
              },
              "Content-Length": {
                "schema": {
                  "type": "integer",
                  "example": "350"
                }
              },
              "Connection": {
                "schema": {
                  "type": "string",
                  "example": "keep-alive"
                }
              },
              "x-request-id": {
                "schema": {
                  "type": "string",
                  "example": "Root=1-616443bd-73428b9677363b9d40b367a8"
                }
              },
              "x-transit-id": {
                "schema": {
                  "type": "string",
                  "example": "bda83e20-2a9b-11ec-9e88-e1ecf83deceb"
                }
              },
              "X-DNS-Prefetch-Control": {
                "schema": {
                  "type": "string",
                  "example": "off"
                }
              },
              "X-Frame-Options": {
                "schema": {
                  "type": "string",
                  "example": "deny"
                }
              },
              "Strict-Transport-Security": {
                "schema": {
                  "type": "string",
                  "example": "max-age=31536000;includesubdomains"
                }
              },
              "X-Download-Options": {
                "schema": {
                  "type": "string",
                  "example": "noopen"
                }
              },
              "X-Content-Type-Options": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "X-XSS-Protection": {
                "schema": {
                  "type": "string",
                  "example": "1;mode=block"
                }
              },
              "ETag": {
                "schema": {
                  "type": "string",
                  "example": "W/\"15e-aRsLA9BzM2LmANsgn72f5jzwuls\""
                }
              },
              "Vary": {
                "schema": {
                  "type": "string",
                  "example": "Accept-Encoding"
                }
              },
              "x-content-type": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "x-permitted-cross-domain-policies": {
                "schema": {
                  "type": "string",
                  "example": "none"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "number",
                      "example": 200
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "module": {
                          "type": "object",
                          "properties": {
                            "to": {
                              "type": "array",
                              "items": {}
                            },
                            "cc": {
                              "type": "array",
                              "items": {}
                            },
                            "bcc": {
                              "type": "array",
                              "items": {}
                            },
                            "templateValues": {
                              "type": "array",
                              "items": {}
                            },
                            "type": {
                              "type": "string",
                              "example": "note"
                            }
                          }
                        },
                        "from": {
                          "type": "object",
                          "properties": {
                            "type": {
                              "type": "string",
                              "example": "user"
                            },
                            "fullName": {
                              "type": "string",
                              "example": "COM - postman"
                            }
                          }
                        },
                        "isFromMigration": {
                          "type": "boolean"
                        },
                        "_id": {
                          "type": "string",
                          "example": "61643413c9cf7a002d929325"
                        },
                        "body": {
                          "type": "string",
                          "example": "This is new message(COM postman)"
                        },
                        "attachments": {
                          "type": "array",
                          "items": {}
                        },
                        "conversationId": {
                          "type": "string",
                          "example": "615997c2e74f61003015ab02"
                        },
                        "createdAt": {
                          "type": "string",
                          "example": "2021-10-11T12:54:43.248Z"
                        },
                        "__v": {
                          "type": "number",
                          "example": 0
                        }
                      }
                    }
                  }
                },
                "example": {
                  "status": 200,
                  "data": {
                    "module": {
                      "to": [],
                      "cc": [],
                      "bcc": [],
                      "templateValues": [],
                      "type": "note"
                    },
                    "isFromMigration": false,
                    "_id": "616443bdc9cf7a002d92933e",
                    "body": "This is new message(COM postman)",
                    "attachments": [],
                    "from": {
                      "type": "user",
                      "fullName": "COM - postman"
                    },
                    "conversationId": "615997c2e74f61003015ab02",
                    "createdAt": "2021-10-11T14:01:33.224Z",
                    "__v": 0
                  }
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
# Get posts (by conversation id)

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
    "/communication/conversations/{conversationId}/posts": {
      "get": {
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "tags": [
          "Inbox Conversations"
        ],
        "summary": "Get posts (by conversation id)",
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
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Sorting, default: `-createdAt` ",
            "example": "-createdAt"
          },
          {
            "name": "cursorAfter",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Pagination cursor, default:`''`.\n\n First request will require only limit parameter and in response you will get cursor object. \n\n Use `cursor.after` to send in query params `cursorAfter` parameter in order to move forward. \n\n Use `cursor.before` to send in query params `cursorBefore` parameter in order to move backwards. \n\n An empty string in after or before cursor in response will indicate that there is no more documents in this direction. \n\n If you sort buy something different than `createdAt`, please make sure include this parameter in fields, or you will get empty cursor. \n\n `cursorAfter` and `cursorBefore` are not allowed to be used at the same time in one request.",
            "example": "MjAyMC0wNy0wOVQxMDowMzozOS43ODBaXzVmMDZlYjdiYzVkODk4MDAyYWMwNTM2Nw=="
          },
          {
            "name": "cursorBefore",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Pagination cursor, default:`null`.",
            "example": "MjAyMC0wNy0xMFQxMDoyMToxMy4yODNaXzVmMDg0MTE5MjhlZjlmMDAyODJjMTVhYg=="
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 14:00:40 GMT"
                }
              },
              "Content-Type": {
                "schema": {
                  "type": "string",
                  "example": "application/json; charset=utf-8"
                }
              },
              "Transfer-Encoding": {
                "schema": {
                  "type": "string",
                  "example": "chunked"
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
                  "example": "Root=1-61644388-68f72b617a99ec1c6d876cb7"
                }
              },
              "x-transit-id": {
                "schema": {
                  "type": "string",
                  "example": "9e2539e0-2a9b-11ec-9e88-e1ecf83deceb"
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
                  "example": "W/\"59b-gx4X//ESubtbbLuxNWPIlx2VkcM\""
                }
              },
              "Vary": {
                "schema": {
                  "type": "string",
                  "example": "Accept-Encoding"
                }
              },
              "Content-Encoding": {
                "schema": {
                  "type": "string",
                  "example": "gzip"
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
                        "count": {
                          "type": "number",
                          "example": 1
                        },
                        "limit": {
                          "type": "number",
                          "example": 25
                        },
                        "sort": {
                          "type": "string",
                          "example": "-createdAt"
                        },
                        "cursor": {
                          "type": "object",
                          "properties": {
                            "after": {
                              "type": "string",
                              "example": ""
                            },
                            "before": {
                              "type": "string",
                              "example": ""
                            }
                          }
                        },
                        "posts": {
                          "type": "array",
                          "items": {
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
                      }
                    }
                  }
                },
                "example": {
                  "status": 200,
                  "data": {
                    "posts": [
                      {
                        "module": {
                          "to": [],
                          "cc": [],
                          "bcc": [],
                          "templateValues": [],
                          "type": "note"
                        },
                        "from": {
                          "type": "user",
                          "fullName": "COM - postman"
                        },
                        "isFromMigration": false,
                        "_id": "61643413c9cf7a002d929325",
                        "body": "This is new message(COM postman)",
                        "attachments": [],
                        "conversationId": "615997c2e74f61003015ab02",
                        "createdAt": "2021-10-11T12:54:43.248Z",
                        "__v": 0
                      },
                      {
                        "module": {
                          "to": [],
                          "cc": [],
                          "bcc": [],
                          "templateValues": [],
                          "type": "note"
                        },
                        "from": {
                          "type": "user",
                          "fullName": "COM - postman"
                        },
                        "isFromMigration": false,
                        "_id": "616430b0c9cf7a002d92931f",
                        "body": "This is new note(COM postman)",
                        "sentBy": "host",
                        "conversationId": "615997c2e74f61003015ab02",
                        "createdAt": "2021-10-11T12:40:16.566Z",
                        "attachments": [],
                        "__v": 0
                      },
                      {
                        "module": {
                          "to": [],
                          "cc": [],
                          "bcc": [],
                          "templateValues": [],
                          "type": "log"
                        },
                        "isFromMigration": false,
                        "_id": "615997cf732aba0030d9de6a",
                        "sentBy": "log",
                        "body": "Reservation VvvPzxBjv status changed to confirmed",
                        "conversationId": "615997c2e74f61003015ab02",
                        "createdAt": "2021-10-03T11:45:19.244Z",
                        "attachments": [],
                        "__v": 0
                      },
                      {
                        "module": {
                          "to": [],
                          "cc": [],
                          "bcc": [],
                          "templateValues": [],
                          "type": "log"
                        },
                        "isFromMigration": false,
                        "_id": "615997c3732aba0030d9de5e",
                        "sentBy": "log",
                        "body": "New guest inquiry",
                        "conversationId": "615997c2e74f61003015ab02",
                        "createdAt": "2021-10-03T11:45:07.029Z",
                        "attachments": [],
                        "__v": 0
                      }
                    ],
                    "count": 4,
                    "limit": 25,
                    "sort": "-createdAt",
                    "cursor": {
                      "after": "MjAyMS0xMC0wM1QxMTo0NTowNy4wMjlaXzYxNTk5N2MzNzMyYWJhMDAzMGQ5ZGU1ZQ==",
                      "before": ""
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Posts not found",
            "content": {}
          },
          "500": {
            "description": "Internal Server Error",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string"
                        }
                      }
                    }
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
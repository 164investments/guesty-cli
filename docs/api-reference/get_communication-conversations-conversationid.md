# Get conversation by id

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
    "/communication/conversations/{conversationId}": {
      "get": {
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "tags": [
          "Inbox Conversations"
        ],
        "summary": "Get conversation by id",
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
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of fields, separated by space. \n\n When `null` retrieve the main properties of the object. \n\nWe recommend always specifying the specific fields you'd like to receive to ensure that you get them. Please see the full list above.",
            "example": "status"
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 14:00:12 GMT"
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
                  "example": "Root=1-6164436c-155e3fee33187a827636deb6"
                }
              },
              "x-transit-id": {
                "schema": {
                  "type": "string",
                  "example": "8d9f0830-2a9b-11ec-9e88-e1ecf83deceb"
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
                  "example": "W/\"5d1-vPvU6Ky+VpjzmI1rNK9jtVPyCm4\""
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
                        "_id": {
                          "type": "string",
                          "example": "6134a49cd450d300307794cb"
                        },
                        "assignee": {
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "string",
                              "example": null
                            }
                          }
                        },
                        "priority": {
                          "type": "number",
                          "example": 10
                        },
                        "meta": {
                          "type": "object",
                          "properties": {
                            "reservations": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "properties": {
                                  "_id": {
                                    "type": "string",
                                    "example": "61347d71d450d300307792a4"
                                  },
                                  "status": {
                                    "type": "string",
                                    "example": "inquiry"
                                  },
                                  "checkIn": {
                                    "type": "string",
                                    "example": "2021-09-04T21:00:00.000Z"
                                  },
                                  "checkOut": {
                                    "type": "string",
                                    "example": "2021-09-05T20:00:00.000Z"
                                  },
                                  "customFields": {
                                    "type": "array",
                                    "items": {}
                                  },
                                  "listing": {
                                    "type": "object",
                                    "properties": {
                                      "tags": {
                                        "type": "array",
                                        "items": {
                                          "type": "string",
                                          "example": "Pool"
                                        }
                                      },
                                      "active": {
                                        "type": "boolean"
                                      },
                                      "_id": {
                                        "type": "string",
                                        "example": "5fba2d97d8e638002d76d842"
                                      },
                                      "picture": {
                                        "type": "object",
                                        "properties": {
                                          "_id": {
                                            "type": "string",
                                            "example": "615c0214cdf3370028883d3a"
                                          },
                                          "thumbnail": {
                                            "type": "string",
                                            "example": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                          }
                                        }
                                      },
                                      "address": {
                                        "type": "object",
                                        "properties": {
                                          "full": {
                                            "type": "string",
                                            "example": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico"
                                          },
                                          "city": {
                                            "type": "string",
                                            "example": "Guadalajara"
                                          },
                                          "country": {
                                            "type": "string",
                                            "example": "Mexico"
                                          },
                                          "state": {
                                            "type": "string",
                                            "example": "Jalisco"
                                          }
                                        }
                                      },
                                      "nickname": {
                                        "type": "string",
                                        "example": "OPS-Listing"
                                      },
                                      "title": {
                                        "type": "string",
                                        "example": "TEST"
                                      },
                                      "customFields": {
                                        "type": "array",
                                        "items": {}
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "guest": {
                              "type": "object",
                              "properties": {
                                "_id": {
                                  "type": "string",
                                  "example": "61347d70d450d300307792a3"
                                },
                                "email": {
                                  "type": "string",
                                  "example": "asdasd@assadsa.com"
                                },
                                "isReturning": {
                                  "type": "boolean"
                                }
                              }
                            }
                          }
                        },
                        "accountId": {
                          "type": "string",
                          "example": "5fb67280e39677002e6c2683"
                        },
                        "createdAt": {
                          "type": "string",
                          "example": "2021-09-05T11:06:05.388Z"
                        },
                        "state": {
                          "type": "object",
                          "properties": {
                            "read": {
                              "type": "boolean"
                            },
                            "status": {
                              "type": "string",
                              "example": "OPEN"
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
                    "_id": "615997c2e74f61003015ab02",
                    "lastMessageFrom": {
                      "user": "2021-10-11T12:40:16.566Z",
                      "nonUser": "2021-10-03T11:45:19.244Z"
                    },
                    "assignee": {
                      "_id": null
                    },
                    "internal": {
                      "language": "en"
                    },
                    "priority": 10,
                    "isFromMigration": false,
                    "meta": {
                      "_id": "615997c2732aba0030d9de56",
                      "reservations": [
                        {
                          "_id": "615997c2e74f61003015aafe",
                          "status": "confirmed",
                          "checkIn": "2021-10-05T20:00:00.000Z",
                          "checkOut": "2021-10-11T19:00:00.000Z",
                          "customFields": [],
                          "listing": {
                            "tags": [
                              "Pool",
                              "Resort",
                              "Another random tag",
                              "abs",
                              "San Fransico"
                            ],
                            "active": true,
                            "_id": "5fba2d97d8e638002d76d842",
                            "picture": {
                              "_id": "615c0214cdf3370028883d3a",
                              "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                            },
                            "address": {
                              "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                              "city": "Guadalajara",
                              "country": "Mexico",
                              "state": "Jalisco"
                            },
                            "nickname": "OPS-Listing",
                            "title": "TEST",
                            "customFields": []
                          },
                          "confirmationCode": "VvvPzxBjv"
                        }
                      ],
                      "integration": {
                        "_id": "5fba2d9cd8e638002d76d8cf",
                        "platform": "manual"
                      },
                      "guest": {
                        "_id": "615997c2e74f61003015aafd",
                        "isReturning": false
                      }
                    },
                    "accountId": "5fb67280e39677002e6c2683",
                    "type": "guest",
                    "state": {
                      "_id": "615997c2732aba0030d9de57",
                      "lastMessage": {
                        "body": "This is new note(COM postman)",
                        "date": "2021-10-11T12:40:16.566Z"
                      }
                    },
                    "createdAt": "2021-10-03T11:45:06.874Z",
                    "modifiedAt": "2021-10-11T12:40:16.566Z",
                    "pendingTasks": [],
                    "__v": 0,
                    "updatedAt": "2021-10-11T12:40:16.566Z",
                    "firstReceptionist": "COM - postman"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Conversation not found",
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
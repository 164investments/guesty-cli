# Get saved reply by id

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
      "name": "Saved Replies"
    }
  ],
  "paths": {
    "/saved-replies/{replyId}": {
      "get": {
        "tags": [
          "Saved Replies"
        ],
        "summary": "Get saved reply by id",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "replyId",
            "in": "path",
            "schema": {
              "type": "string"
            },
            "required": true,
            "description": "Saved reply Id",
            "example": "61643c7e8eb305002d90151f"
          },
          {
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of fields, separated by space. See response schema to get the list of fields.",
            "example": "question answer folder"
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 13:52:34 GMT"
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
                  "example": "345"
                }
              },
              "Connection": {
                "schema": {
                  "type": "string",
                  "example": "keep-alive"
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
              "Access-Control-Allow-Credentials": {
                "schema": {
                  "type": "boolean",
                  "example": "true"
                }
              },
              "Access-Control-Allow-Origin": {
                "schema": {
                  "type": "string",
                  "example": "*"
                }
              },
              "Access-Control-Max-Age": {
                "schema": {
                  "type": "integer",
                  "example": "7200"
                }
              },
              "Access-Control-Allow-Headers": {
                "schema": {
                  "type": "string",
                  "example": "Authorization, Origin, Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-File-Name, g-aid-cs"
                }
              },
              "Access-Control-Allow-Methods": {
                "schema": {
                  "type": "string",
                  "example": "POST, GET, PUT, DELETE, PATCH, OPTIONS"
                }
              },
              "uber-trace-id": {
                "schema": {
                  "type": "string",
                  "example": "929a0ede64be4275:929a0ede64be4275:0:1"
                }
              },
              "uberctx-accountid": {
                "schema": {
                  "type": "string",
                  "example": "5fb67280e39677002e6c2683"
                }
              },
              "x-request-id": {
                "schema": {
                  "type": "string",
                  "example": "929a0ede64be4275"
                }
              },
              "ETag": {
                "schema": {
                  "type": "string",
                  "example": "W/\"159-kVOXmOwipj6/j+5CCVtWbg49un4\""
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
                  "allOf": [
                    {
                      "type": "object",
                      "properties": {
                        "question": {
                          "type": "string",
                          "example": "TV"
                        },
                        "answer": {
                          "type": "string",
                          "example": "Hi {{user}},\n\nWe have a 42\" Samsung LED in the living room."
                        },
                        "applyWhenHasBooking": {
                          "type": "boolean"
                        },
                        "applyWhenNoBooking": {
                          "type": "boolean"
                        },
                        "isAbstract": {
                          "type": "boolean"
                        },
                        "type": {
                          "type": "string",
                          "enum": [
                            "user",
                            "guest",
                            "contact",
                            "review"
                          ]
                        },
                        "language": {
                          "description": "Language of the saved reply.",
                          "type": "string",
                          "enum": [
                            "en",
                            "fr",
                            "es",
                            "it",
                            "ru",
                            "ja",
                            "zh"
                          ],
                          "example": "en"
                        },
                        "excludeListingIds": {
                          "description": "Exclude saved reply from the specific listings",
                          "type": "array",
                          "items": {
                            "type": "string",
                            "description": "Unique Id",
                            "example": "563e0b6a08a2710e00057b82"
                          }
                        },
                        "listingsIds": {
                          "description": "Apply saved reply for the specific listings",
                          "type": "array",
                          "items": {
                            "type": "string",
                            "description": "Unique Id",
                            "example": "563e0b6a08a2710e00057b82"
                          }
                        },
                        "folder": {
                          "type": "string",
                          "example": "City"
                        },
                        "tags": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        },
                        "filters": {
                          "description": "Apply saved reply to listings which match the filters",
                          "type": "object",
                          "properties": {
                            "_id": {
                              "type": "string",
                              "description": "Unique Id",
                              "example": "563e0b6a08a2710e00057b82"
                            },
                            "field": {
                              "type": "string",
                              "description": "Subject of the filter, e.g. listing.address.city"
                            },
                            "operator": {
                              "type": "string",
                              "description": "Enhanced MongoDB comparison operator: $eq, $not, $contains, $notcontains, $gt, $lt, $between"
                            },
                            "value": {
                              "type": "array",
                              "description": "Values to filter by.",
                              "items": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      }
                    },
                    {
                      "type": "object",
                      "properties": {
                        "accountId": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        },
                        "_id": {
                          "type": "string",
                          "description": "Unique Id",
                          "example": "563e0b6a08a2710e00057b82"
                        }
                      }
                    }
                  ]
                },
                "example": {
                  "listingsIds": [],
                  "excludeListingIds": [],
                  "tags": [],
                  "applyWhenHasBooking": true,
                  "applyWhenNoBooking": true,
                  "isAbstract": false,
                  "type": "guest",
                  "language": "en",
                  "_id": "61643c7e8eb305002d90151f",
                  "question": "Mirror, mirror, on the wall, Who in this land is fairest of all?",
                  "answer": "not you?",
                  "accountId": "5fb67280e39677002e6c2683",
                  "__v": 0,
                  "filters": []
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string",
                  "example": "Canned response not found"
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
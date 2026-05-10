# Get saved replies

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
    "/saved-replies": {
      "get": {
        "tags": [
          "Saved Replies"
        ],
        "summary": "Get saved replies",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "description": "Pagination limit, max: 100",
            "example": "25"
          },
          {
            "name": "skip",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "description": "How many results should be skipped to get to the current page",
            "example": "0"
          },
          {
            "name": "listingId",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Limit results to a specific listing",
            "example": "531968414930a7f09b075800"
          },
          {
            "name": "accountId",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Limit results to a specific account",
            "example": "531968414930a7f09b075800"
          },
          {
            "name": "returnDefault",
            "in": "query",
            "schema": {
              "type": "boolean"
            },
            "description": "To get Guesty defaults SRs",
            "example": "true"
          },
          {
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of fields, separated by space. See response schema to get list of fields",
            "example": "createdAt"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Field to sort by. Prepend - for DESC.",
            "example": "createdAt"
          },
          {
            "name": "q",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Search query string. Searches in question and folder. Search is case-insensitive.",
            "example": "TV"
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 13:34:49 GMT"
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
                  "example": "447"
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
                  "example": "4e62a2bb5c4017ea:4e62a2bb5c4017ea:0:1"
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
                  "example": "4e62a2bb5c4017ea"
                }
              },
              "ETag": {
                "schema": {
                  "type": "string",
                  "example": "W/\"1bf-6o3yuS0pz3CMiVYMWq9EUDdNpu0\""
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
                    "count": {
                      "type": "number",
                      "example": 2
                    },
                    "limit": {
                      "type": "number",
                      "example": 25
                    },
                    "skip": {
                      "type": "number",
                      "example": 50
                    },
                    "results": {
                      "type": "array",
                      "items": {
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
                      }
                    }
                  }
                },
                "example": {
                  "count": 2,
                  "limit": 25,
                  "skip": 0,
                  "results": [
                    {
                      "_id": "5dbf05cad78ae2001f57389e",
                      "applyWhenHasBooking": true,
                      "applyWhenNoBooking": true,
                      "isAbstract": false,
                      "type": "guest",
                      "language": "en",
                      "question": "TV",
                      "answer": "Hi {{user}},\n\nWe have a 42\" Samsung LED in the living room.\n\nRegards,\n{{host}}",
                      "accountId": null
                    },
                    {
                      "_id": "5dc96c0294079e001e53bf89",
                      "applyWhenHasBooking": true,
                      "applyWhenNoBooking": true,
                      "isAbstract": false,
                      "type": "guest",
                      "language": "en",
                      "question": "Luggage",
                      "answer": "You can leave your luggage in the lobby if you arrive early. Same thing if you will be checking-out and would like to roam around afterwards.",
                      "accountId": null
                    }
                  ]
                }
              }
            }
          },
          "403": {
            "description": "User does not have the permissions to use this endpoint",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string",
                  "example": "Forbidden res"
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
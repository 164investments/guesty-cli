# [Beta] Retrieve a list of supported languages for specific listing

Retrieve a list of supported languages for specific listing by listing id

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
      "name": "Marketing fields"
    }
  ],
  "paths": {
    "/marketing/languages/{id}": {
      "get": {
        "operationId": "getPropertyLanguages",
        "summary": "[Beta] Retrieve a list of supported languages for specific listing",
        "description": "Retrieve a list of supported languages for specific listing by listing id",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The listing ID whose languages you wish to retrieve or upsert",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return a list of languages",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "slug": {
                        "type": "string"
                      },
                      "active": {
                        "type": "boolean"
                      }
                    },
                    "example": {
                      "name": "German - Germany",
                      "slug": "de_de",
                      "active": true
                    }
                  },
                  "example": [
                    {
                      "name": "English - United States",
                      "slug": "en_us",
                      "active": true
                    },
                    {
                      "name": "German - Germany",
                      "slug": "de_de",
                      "active": true
                    },
                    {
                      "name": "Italian - Italy",
                      "slug": "it_it",
                      "active": false
                    },
                    {
                      "name": "Portuguese - Portugal",
                      "slug": "pt_pt",
                      "active": false
                    },
                    {
                      "name": "Polish - Poland",
                      "slug": "pl_pl",
                      "active": false
                    },
                    {
                      "name": "Spanish - Spain",
                      "slug": "es_es",
                      "active": false
                    },
                    {
                      "name": "Japanese - Japan",
                      "slug": "ja_jp",
                      "active": false
                    },
                    {
                      "name": "Greek - Greece",
                      "slug": "el_gr",
                      "active": false
                    },
                    {
                      "name": "Korean - Korea",
                      "slug": "ko_kr",
                      "active": false
                    },
                    {
                      "name": "Romanian - Romania",
                      "slug": "ro_ro",
                      "active": false
                    },
                    {
                      "name": "Indonesian - Indonesia",
                      "slug": "in_in",
                      "active": false
                    },
                    {
                      "name": "French - France",
                      "slug": "fr_fr",
                      "active": false
                    },
                    {
                      "name": "Chinese - China",
                      "slug": "zh_chs",
                      "active": false
                    },
                    {
                      "name": "Dutch - Netherlands",
                      "slug": "nl_nl",
                      "active": false
                    }
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "example": "UNAUTHORIZED"
                        },
                        "message": {
                          "type": "string",
                          "example": "Unauthorized"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not Found",
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
                          "example": "Not Found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
                        },
                        "data": {
                          "type": "string",
                          "example": "Not Found"
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
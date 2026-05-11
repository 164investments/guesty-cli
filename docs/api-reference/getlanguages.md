# Retrieve a list of supported languages.

Retrieve a list of supported languages.

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
    "/marketing/languages": {
      "get": {
        "operationId": "getLanguages",
        "summary": "Retrieve a list of supported languages.",
        "description": "Retrieve a list of supported languages.",
        "tags": [
          "Marketing fields"
        ],
        "parameters": [],
        "responses": {
          "200": {
            "description": "Return a list of supported languages",
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
                      }
                    },
                    "example": {
                      "name": "German - Germany",
                      "slug": "de_de"
                    }
                  },
                  "example": [
                    {
                      "name": "German - Germany",
                      "slug": "de_de"
                    },
                    {
                      "name": "Italian - Italy",
                      "slug": "it_it"
                    },
                    {
                      "name": "Portuguese - Portugal",
                      "slug": "pt_pt"
                    },
                    {
                      "name": "Polish - Poland",
                      "slug": "pl_pl"
                    },
                    {
                      "name": "Spanish - Spain",
                      "slug": "es_es"
                    },
                    {
                      "name": "English - United States",
                      "slug": "en_us"
                    },
                    {
                      "name": "Japanese - Japan",
                      "slug": "ja_jp"
                    },
                    {
                      "name": "Greek - Greece",
                      "slug": "el_gr"
                    },
                    {
                      "name": "Korean - Korea",
                      "slug": "ko_kr"
                    },
                    {
                      "name": "Romanian - Romania",
                      "slug": "ro_ro"
                    },
                    {
                      "name": "Indonesian - Indonesia",
                      "slug": "in_in"
                    },
                    {
                      "name": "French - France",
                      "slug": "fr_fr"
                    },
                    {
                      "name": "Chinese - China",
                      "slug": "zh_chs"
                    },
                    {
                      "name": "Dutch - Netherlands",
                      "slug": "nl_nl"
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
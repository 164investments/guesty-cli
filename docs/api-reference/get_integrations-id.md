# Get integration

Use this endpoint to retrieve all a single account integration.

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
      "name": "Integrations"
    }
  ],
  "paths": {
    "/integrations/{id}": {
      "get": {
        "tags": [
          "Integrations"
        ],
        "summary": "Get integration",
        "description": "Use this endpoint to retrieve all a single account integration.",
        "parameters": [
          {
            "name": "id",
            "description": "Integration ID",
            "in": "path",
            "example": "5fa02fa358d2db673e17de3f",
            "schema": {
              "type": "string"
            },
            "required": true
          },
          {
            "name": "fields",
            "in": "query",
            "description": "Selection of fields, separated by space. When null retrieve the main properties of the object. We recommend always specifying the specific fields you'd like to receive to ensure that you get them. Please see the full list above",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "User Integration",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "Unique Id",
                      "example": "5958c7e5884e961000817799"
                    },
                    "airbnb2": {
                      "type": "object",
                      "properties": {
                        "credentials": {
                          "type": "object",
                          "properties": {
                            "code": {
                              "type": "string"
                            },
                            "expiresAt": {
                              "type": "integer"
                            },
                            "accessToken": {
                              "type": "string"
                            },
                            "refreshToken": {
                              "type": "string"
                            },
                            "lastForceRefresh": {
                              "type": "string",
                              "description": "date"
                            }
                          }
                        },
                        "forwardEmails": {
                          "type": "object",
                          "properties": {
                            "all": {
                              "type": "boolean",
                              "default": true
                            },
                            "emails": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            }
                          }
                        },
                        "createdAt": {
                          "type": "string",
                          "description": "date"
                        }
                      },
                      "description": "Only if platform is airbnb",
                      "example": {
                        "ignored": {
                          "reservations": [],
                          "listings": []
                        },
                        "emailsFromSupport": []
                      }
                    },
                    "forwardEmails": {
                      "type": "object",
                      "properties": {
                        "all": {
                          "type": "boolean",
                          "default": true
                        },
                        "emails": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "active": {
                      "type": "boolean",
                      "description": "Status of connection"
                    },
                    "platform": {
                      "type": "string"
                    },
                    "listings": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "description": "Listing details"
                      }
                    },
                    "complexes": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "description": "Complex details"
                      }
                    },
                    "nickname": {
                      "type": "string",
                      "example": "naama"
                    },
                    "channelId": {
                      "type": "string"
                    },
                    "activatedAt": {
                      "type": "string",
                      "description": "Date"
                    },
                    "disconnectedAt": {
                      "type": "string",
                      "description": "Date"
                    },
                    "proxyEmail": {
                      "type": "string"
                    },
                    "incomingEmail": {
                      "type": "string"
                    },
                    "externalAccountId": {
                      "type": "string"
                    },
                    "id": {
                      "type": "integer",
                      "example": "naama@user.guesty.com",
                      "description": "External ID"
                    },
                    "companyName": {
                      "type": "string"
                    },
                    "fetchRequests": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "fetchAllListings": {
                            "type": "boolean"
                          },
                          "externalListingIds": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          },
                          "status": {
                            "type": "string",
                            "enum": [
                              "NOT_STARTED",
                              "IN_PROGRESS",
                              "COMPLETED",
                              "FAILED",
                              "TIMEOUT"
                            ]
                          },
                          "createTime": {
                            "type": "string",
                            "description": "Date"
                          },
                          "updateTime": {
                            "type": "string",
                            "description": "Date"
                          },
                          "finishedTime": {
                            "type": "string",
                            "description": "Date"
                          }
                        }
                      }
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "NOT_CONNECTED",
                        "CONNECTING",
                        "CONNECTED",
                        "FAILED",
                        "TIMEOUT",
                        "DISCONNECTED",
                        "PENDING"
                      ]
                    },
                    "migration": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "string",
                          "enum": [
                            "IN_PROGRESS",
                            "COMPLETED",
                            "FAILED"
                          ]
                        },
                        "createTime": {
                          "type": "string",
                          "description": "Date"
                        },
                        "updateTime": {
                          "type": "string",
                          "description": "Date"
                        },
                        "finishedTime": {
                          "type": "string",
                          "description": "Date"
                        },
                        "steps": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "description": "Step details"
                          }
                        },
                        "discrepancyStepExecuted": {
                          "type": "boolean",
                          "default": false
                        },
                        "discrepancyResolution": {
                          "type": "string",
                          "enum": [
                            "GUESTY",
                            "AIRBNB"
                          ]
                        },
                        "listingQuantityDiscrepancyStepExecuted": {
                          "type": "boolean",
                          "default": false
                        },
                        "error": {
                          "type": "object",
                          "properties": {
                            "at": {
                              "type": "string",
                              "description": "Date"
                            },
                            "code": {
                              "type": "string"
                            },
                            "message": {
                              "type": "string"
                            },
                            "raw": {
                              "type": "object"
                            }
                          }
                        },
                        "notes": {
                          "type": "string"
                        },
                        "isRollingBack": {
                          "type": "boolean",
                          "default": false
                        }
                      }
                    },
                    "userId": {
                      "type": "string",
                      "example": "563e0b6a08a2710e00057b85"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Owner",
                      "example": "563e0b6a08a2710e00057b82"
                    },
                    "tripAdvisor": {
                      "type": "object",
                      "description": "TripAdvisor details"
                    },
                    "homeaway2": {
                      "type": "object",
                      "description": "Homeaway details"
                    },
                    "bookingCom": {
                      "type": "object",
                      "properties": {
                        "legalEntityId": {
                          "type": "string"
                        }
                      },
                      "description": "BookingCom details"
                    },
                    "createdAt": {
                      "type": "string",
                      "description": "Date"
                    },
                    "missingStep": {
                      "type": "string"
                    },
                    "steps": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "type": {
                            "type": "string"
                          },
                          "status": {
                            "type": "string",
                            "enum": [
                              "COMPLETED",
                              "IN_PROGRESS"
                            ]
                          },
                          "createTime": {
                            "type": "string",
                            "description": "Date"
                          },
                          "updateTime": {
                            "type": "string",
                            "description": "Date"
                          }
                        }
                      }
                    },
                    "newIntegrationBackup": {
                      "type": "object"
                    },
                    "threadIdsMigrated": {
                      "type": "boolean"
                    },
                    "isDeleted": {
                      "type": "boolean"
                    },
                    "deletedAt": {
                      "type": "string",
                      "description": "Date"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string"
                        },
                        "message": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "required": [
                    "error"
                  ],
                  "example": {
                    "error": {
                      "code": "UNAUTHORIZED",
                      "message": "Unauthorized"
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Forbidden"
                }
              }
            }
          },
          "404": {
            "description": "Not Found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Integration Not Found"
                }
              }
            }
          },
          "500": {
            "description": "Unhandled exception. Something went wrong on server.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "Internal Server Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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
# Update integration

Selectively update fields of single account integration.

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
      "put": {
        "tags": [
          "Integrations"
        ],
        "summary": "Update integration",
        "description": "Selectively update fields of single account integration.",
        "parameters": [
          {
            "name": "id",
            "description": "Integration ID",
            "example": "5fa02fa358d2db673e17de3f",
            "in": "path",
            "schema": {
              "type": "string"
            },
            "required": true
          }
        ],
        "requestBody": {
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
                    "type": "string",
                    "example": "airbnb2",
                    "description": "Platform information"
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
                    "example": "naama",
                    "description": "Integration nickname"
                  },
                  "channelId": {
                    "type": "string",
                    "example": "airbnb2",
                    "description": "Channel Id"
                  },
                  "proxyEmail": {
                    "type": "string",
                    "example": "test@user.guesty.com"
                  },
                  "incomingEmail": {
                    "type": "string",
                    "example": "test@user.guesty.com"
                  },
                  "externalAccountId": {
                    "type": "string",
                    "example": "123456789"
                  },
                  "id": {
                    "type": "integer",
                    "example": "naama@user.guesty.com",
                    "description": "External ID"
                  },
                  "companyName": {
                    "type": "string",
                    "description": "Company name",
                    "example": "Test company"
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
                    "description": "Status of integration",
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
                  "missingStep": {
                    "type": "string",
                    "example": "add_account_settings",
                    "description": "Missing integration step"
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
                        }
                      }
                    }
                  },
                  "newIntegrationBackup": {
                    "type": "object"
                  },
                  "threadIdsMigrated": {
                    "type": "boolean",
                    "example": "false"
                  },
                  "isDeleted": {
                    "type": "boolean",
                    "description": "Flag to delete integration"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Integration object",
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
          "400": {
            "description": "Invalid Input",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string",
                  "example": "API is deprecated for HomeAway integrations"
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
          "500": {
            "description": "Internal Server Error",
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
        "deprecated": true,
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
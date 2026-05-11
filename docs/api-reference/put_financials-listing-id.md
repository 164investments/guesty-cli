# Update listing Financials

Only accessible to Admin or User tokens.

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
      "name": "Listings"
    }
  ],
  "paths": {
    "/financials/listing/{id}": {
      "put": {
        "tags": [
          "Listings"
        ],
        "summary": "Update listing Financials",
        "description": "Only accessible to Admin or User tokens.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Select financials fields with updated values",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "description": "Select financials fields with updated values. Non-updated fields are not required in the body",
                "properties": {
                  "guestsIncludedInRegularFee": {
                    "type": "number",
                    "description": "The higest number of guests that will not reauires to add extraPersonFee"
                  },
                  "extraPersonFee": {
                    "type": "number",
                    "description": "The amount of fee which is added for each extra person, above guestsIncludedInRegularFee, in the reservation"
                  },
                  "basePrice": {
                    "type": "number",
                    "description": "The cost per night for the listing"
                  },
                  "basePriceUSD": {
                    "type": "number",
                    "description": "The cost per night in USD for the listing"
                  },
                  "monthlyPriceFactor": {
                    "type": "number",
                    "description": "A factor for the nightly cost for reservations that are longer then a month"
                  },
                  "weeklyPriceFactor": {
                    "type": "number",
                    "description": "A factor for the nightly cost for reservations that are longer then a week"
                  },
                  "weekendBasePrice": {
                    "type": "number",
                    "description": "The base price for weekend"
                  },
                  "securityDepositFee": {
                    "type": "number"
                  },
                  "currency": {
                    "type": "string",
                    "description": "The currency that is in use for the listing prices"
                  },
                  "cleaningFee": {
                    "type": "object",
                    "description": "Object to define cleaningFee settings",
                    "properties": {
                      "value": {
                        "type": "object",
                        "description": "Default settings for cleaning fee",
                        "properties": {
                          "valueType": {
                            "type": "string",
                            "description": "Defines rather value is a fixed number or percentage",
                            "enum": [
                              "FIXED",
                              "PERCENTAGE"
                            ]
                          },
                          "multiplier": {
                            "type": "string",
                            "description": "Sets the factor by which cleaning fee value will be multiplied",
                            "enum": [
                              "PER_STAY",
                              "PER_GUEST",
                              "PER_NIGHT",
                              "PER_GUEST_PER_NIGHT"
                            ]
                          },
                          "formula": {
                            "type": "number",
                            "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                          }
                        }
                      },
                      "lastUpdatedAt": {
                        "type": "string",
                        "format": "date",
                        "description": "Last update date"
                      },
                      "airbnb": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      },
                      "rentalsUnited": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      },
                      "homeAway": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      },
                      "expedia": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      },
                      "despegar": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      },
                      "bookingCom": {
                        "type": "object",
                        "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                        "properties": {
                          "value": {
                            "type": "object",
                            "properties": {
                              "valueType": {
                                "type": "string",
                                "description": "Defines rather value is a fixed number or percentage",
                                "enum": [
                                  "FIXED",
                                  "PERCENTAGE"
                                ]
                              },
                              "multiplier": {
                                "type": "string",
                                "description": "Sets the factor by which cleaning fee value will be multiplied",
                                "enum": [
                                  "PER_STAY",
                                  "PER_GUEST",
                                  "PER_NIGHT",
                                  "PER_GUEST_PER_NIGHT"
                                ]
                              },
                              "formula": {
                                "type": "number",
                                "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                              },
                              "_id": {
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
        "responses": {
          "200": {
            "description": "The Updated financials object",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "guestsIncludedInRegularFee": {
                      "type": "number",
                      "description": "The higest number of guests that will not reauires to add extraPersonFee"
                    },
                    "extraPersonFee": {
                      "type": "number",
                      "description": "The amount of fee which is added for each extra person, above guestsIncludedInRegularFee, in the reservation"
                    },
                    "basePrice": {
                      "type": "number",
                      "description": "The cost per night for the listing"
                    },
                    "basePriceUSD": {
                      "type": "number",
                      "description": "The cost per night in USD for the listing"
                    },
                    "monthlyPriceFactor": {
                      "type": "number",
                      "description": "A factor for the nightly cost for reservations that are longer then a month"
                    },
                    "weeklyPriceFactor": {
                      "type": "number",
                      "description": "A factor for the nightly cost for reservations that are longer then a week"
                    },
                    "weekendBasePrice": {
                      "type": "number",
                      "description": "The base price for weekend"
                    },
                    "securityDepositFee": {
                      "type": "number"
                    },
                    "currency": {
                      "type": "string",
                      "description": "The currency that is in use for the listing prices"
                    },
                    "cleaningFee": {
                      "type": "object",
                      "description": "Object to define cleaningFee settings",
                      "properties": {
                        "value": {
                          "type": "object",
                          "description": "Default settings for cleaning fee",
                          "properties": {
                            "valueType": {
                              "type": "string",
                              "description": "Defines rather value is a fixed number or percentage",
                              "enum": [
                                "FIXED",
                                "PERCENTAGE"
                              ]
                            },
                            "multiplier": {
                              "type": "string",
                              "description": "Sets the factor by which cleaning fee value will be multiplied",
                              "enum": [
                                "PER_STAY",
                                "PER_GUEST",
                                "PER_NIGHT",
                                "PER_GUEST_PER_NIGHT"
                              ]
                            },
                            "formula": {
                              "type": "number",
                              "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                            }
                          }
                        },
                        "lastUpdatedAt": {
                          "type": "string",
                          "format": "date",
                          "description": "Last update date"
                        },
                        "airbnb": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        },
                        "rentalsUnited": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        },
                        "homeAway": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        },
                        "expedia": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        },
                        "despegar": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        },
                        "bookingCom": {
                          "type": "object",
                          "description": "For channel specific cleaningFee settings, the 'value' field will be saved under the channel name",
                          "properties": {
                            "value": {
                              "type": "object",
                              "properties": {
                                "valueType": {
                                  "type": "string",
                                  "description": "Defines rather value is a fixed number or percentage",
                                  "enum": [
                                    "FIXED",
                                    "PERCENTAGE"
                                  ]
                                },
                                "multiplier": {
                                  "type": "string",
                                  "description": "Sets the factor by which cleaning fee value will be multiplied",
                                  "enum": [
                                    "PER_STAY",
                                    "PER_GUEST",
                                    "PER_NIGHT",
                                    "PER_GUEST_PER_NIGHT"
                                  ]
                                },
                                "formula": {
                                  "type": "number",
                                  "description": "Defines the cleaningFee value, as fixed or as a percentage accordinf to 'valueType'"
                                },
                                "_id": {
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